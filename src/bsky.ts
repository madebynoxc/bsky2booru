import { PostView } from '@atproto/api/dist/client/types/app/bsky/feed/defs';
import { AppBskyEmbedImages, AppBskyEmbedRecordWithMedia, AppBskyEmbedVideo, AtpAgent } from '@atproto/api';
import { Pool } from 'pg';
import YTDlpWrap from 'yt-dlp-wrap';

import { isPostProcessed, markPostAsProcessed, createTableIfNotExists } from "./db";
import { downloadImage, unlinkFile, uploadToShimmie2 } from "./io";

function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_]+)/gmu);
  return matches ? matches.map(tag => tag.replace('#', '')) : [];
}

function extractTextAndImages(post: PostView): { text: string; embeds: string[]; containsVideo: boolean } {
  // Extract text (if available)
  var text = (post.record as { text?: string })?.text || '';

  // Extract images if the post contains an image embed
  const embeds: string[] = [];

  let containsVideo = false;

  if (post.embed && '$type' in post.embed) {
    if (post.embed.$type === 'app.bsky.embed.images#view') { // For image posts
      embeds.push(...(post.embed as AppBskyEmbedImages.View).images.map(img => img.fullsize));
    }
    else if (post.embed.$type === 'app.bsky.embed.video#view') { // For video posts (thumbnails only)
      containsVideo = true;
    }
    else if (post.embed.$type === 'app.bsky.embed.recordWithMedia#view') { // For reposts
      const record = post.embed as AppBskyEmbedRecordWithMedia.View;
      text = (record as { text?: string })?.text || '';

      if (record.media.$type === 'app.bsky.embed.images#view') {
        embeds.push(...(record.media as AppBskyEmbedImages.View).images.map(img => img.fullsize));
      }
      else if (record.media.$type === 'app.bsky.embed.video#view') {
        containsVideo = true;
      }
    }
  }

  return { text, embeds, containsVideo };
}

export async function bskyAuthenticate(agent : AtpAgent, username: string, password: string) {
  console.log('Authenticating as user:', username);
  await agent.login({ identifier: username, password: password });
  console.log('Authenticated as:', agent.session?.did);
}

export async function bskyRun(agent : AtpAgent, pool : Pool, ytDlpWrap : YTDlpWrap, cursor?: string, options?: { scanAll?: boolean, delay?: number }) {
  if (!agent.session) {
    console.error('Not authenticated');
    return;
  }

  await createTableIfNotExists(pool, 'public');
    
  let hasMore = true;
  const scanAll = options?.scanAll || false;
  const delay = options?.delay || 3000;
    
  while (hasMore) {
    const res = await agent.app.bsky.feed.getActorLikes({
      actor: agent.session.did,
      limit: 25,
      cursor,
    });

    cursor = res.data.cursor;
    hasMore = !!cursor;
  
    for (const feedpost of res.data.feed) {
      var post = feedpost.post;
      const blueskyUri = post.uri;
      const content = extractTextAndImages(post);
      if (await isPostProcessed(pool, blueskyUri)) {
        if (scanAll) {
          console.log('Already processed:', blueskyUri);
          continue;
        }
        else {
          console.log('Reached last known post. Terminating.');
          hasMore = false;
          break;
        }
      }
      
      const name = blueskyUri.split('/').pop()
      const blueskyUrl = `https://bsky.app/profile/${post.author.did}/post/${name}`;
      const hashtags = extractHashtags(content.text || '');
      const tags = ['bluesky', `artist:${post.author.handle.replace('.bsky.social', '')}`, ...hashtags];

      console.log('Processing:', blueskyUri);
      console.log('Tags:', tags);
    
      if (content.embeds.length > 0) {
        for (const imageUrl of content.embeds) {
          const filename = imageUrl.split('/').pop();
          const ext = filename?.split('@').pop();
          const pathname = `./temp/${filename}.${ext}`;
          await downloadImage(imageUrl, pathname);
          await uploadToShimmie2(pathname, blueskyUrl, tags);
          unlinkFile(pathname);
        }
      }

      if (content.containsVideo) {
        const filename = blueskyUri.split('/').pop();
        const pathname = `./temp/${filename}.mp4`;
        try {
          await ytDlpWrap.execPromise([
            blueskyUrl,
            '-o',
            pathname,
          ]);

          await uploadToShimmie2(pathname, blueskyUrl, tags);
          unlinkFile(pathname);
        } catch (e) {
          console.error('Failed to download video:', blueskyUri);
          console.error(e);
        }
      }
    
      await markPostAsProcessed(pool, blueskyUri); // Save to DB
    }

    await new Promise(resolve => setTimeout(resolve, delay)); // Rate limit
  }
}
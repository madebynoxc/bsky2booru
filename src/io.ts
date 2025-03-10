import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export async function downloadImage(url: string, filepath: string) {
  const response = await axios({
    url,
    responseType: 'stream',
  });

  return new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

export function unlinkImage(filepath: string) {
  fs.unlinkSync(filepath);
}

export async function uploadToShimmie2(filepath: string, blueskyUrl: string, tags: string[]) {
  const url = process.env.SHIMMIE_API_URL;
  if (!url) {
    console.error('SHIMMIE_API_URL is not set');
    return;
  }
  
  const form = new FormData();
  const stream = fs.createReadStream(filepath);
  form.append('file', stream);
  form.append('source', blueskyUrl); // Adds the Bluesky post as the source
  form.append('tags', tags.join(' ')); // Space-separated tags for metadata
  const login = process.env.SHIMMIE_USERNAME!;
  const password = process.env.SHIMMIE_API_KEY!;
  const params = new URLSearchParams({ login, password });
  params.forEach((value, key) => form.append(key, value)); 

  await axios.post(url, form, {
    withCredentials: true,
    headers: {
        ...form.getHeaders(),
    },
  }).catch(function (error) {
    if (error.response) {
      if (error.response.headers['x-danbooru-errors']) {
        console.log('Not processed, endpoint replied with:', 
          error.response.status,
          error.response.headers['x-danbooru-errors'], 
          error.response.headers['x-danbooru-location']);
      }
      else 
      {
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      }
    } else if (error.request) {
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
    }
  });
}
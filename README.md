**Export your BlueSky likes to you local Shimmie2 or Danbooru instance.**
Supports images, reposted images and videos through yt-dlp. Post author will be added as `artist:bsky-handle` tag and text will be analyzed for any `#` words and add it as tags (Japanese characters are supported). An extra `bluesky` tag will be added.
I recommend creating special account in your Shimmie for this purpose, so in a case you need to re-run, you can delete that account will all images.

## Requirements
- BlueSky account.
- PostgreSQL running on the network.
- Shimmie2 or Danbooru running on the network (Danbooru hasn't been tested, but Shimmie Danbooru 1.0 API plugin).
- If using Shimmie2, make sure that `Danbooru Client API` extension is enabled.

## First run
If you don't have `pnpm` installed (`pnpm --version`) you can install it [here](https://pnpm.io/installation).

After pulling this repository:
```sh
pnpm i && pnpm build
```

Make your own `.env` file from the template.
```sh
cp .env.template .env
vim .env
```

- `DATABASE_URL` - Connection string to PostreSQL database (feel free to use Shimmie DB, this script will only add one table).
- `BSKY_USERNAME` - Your BlueSky username.
- `BSKY_PASSWORD` - Bluesky App password (get it [here](https://bsky.app/settings/app-passwords)).
- `BSKY_PAGE_DELAY` - Delay (in ms) between page requests from bsky API.
- `SHIMMIE_API_URL` - API URL for image upload.
- `SHIMMIE_USERNAME` - Image upload username.
- `SHIMMIE_API_KEY` - Image upload key/password.
- `SCAN_ALL` - Determines if the script will continue scanning likes after encountering a familiar one. Leave it at `1` for now.
- `YTDLPATH` - (optional) You may specify path to the yt-dlp binary for video downloads. Otherwise the latest release will be downloaded automatically.

Run with:
```sh
pnpm start
```
The script will slowly go through all your likes and import them into Shimmie. It will log BlueSky URI of the post and any tags it found. In case of error, the script will log it and continue.

## Scheduled run
After importing all your likes, switch `SCAN_ALL` flag to `0` and schedule to run this script using Cron. 
Here is my configuration (every 6h):

```sh
0 */6 * * * cd /home/noxc/bsky2booru && /home/noxc/.local/share/pnpm/pnpm start >> ./crontab.log 2>&1
```

If you ancounter issues with PATH, add it before any Cron entries, e.g.:

```sh
PATH=/home/noxc/.local/share/pnpm
```

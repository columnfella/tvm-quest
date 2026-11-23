# Deploying Finance Quest on Vercel

It takes about 10 minutes and is free (Vercel Hobby plan + Upstash Redis free tier).
You need the GitHub repo (it can stay private) and a GitHub account to sign in with.

## 1. Create the Vercel project

1. Go to [vercel.com/signup](https://vercel.com/signup) and choose **Continue with GitHub**.
2. Click **Add New… → Project**.
3. Find the `tvm-quest` repository and click **Import**.
   If it isn't listed, click **Adjust GitHub App Permissions** and give Vercel access to that repo.
4. Leave every setting at its default. Vercel detects Next.js automatically:
   - Framework preset: **Next.js**
   - Build command: `next build` · Output: default · Install: `npm install`
5. Click **Deploy** and wait for the build to finish (about 1–2 minutes).

The site now works, **but the leaderboard won't save yet**. That needs the database (step 2).

## 2. Add the database (Upstash Redis)

1. In your new project, open the **Storage** tab.
2. Click **Create Database** (or **Browse Marketplace**) and pick **Upstash → Redis**.
3. Choose a name (e.g. `finance-quest`), the region closest to your students (e.g. Frankfurt for Morocco), and the **Free** plan.
4. When asked, **connect it to the `tvm-quest` project** for all environments (Production, Preview, Development).
   This adds the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
5. Go to **Deployments**, open the menu (⋯) on the latest deployment and click **Redeploy**.
   Environment variables only apply to new deployments.

## 3. Check it works

1. Open your site's URL (shown on the project page, like `https://tvm-quest-xxxx.vercel.app`).
2. Sign up with a test name, finish one lesson, then refresh the page: you should still be logged in,
   and your name should appear on the **Season Ranking** card.
3. Open the site in a private window and sign up with a second name: both should show on the leaderboard.

If the leaderboard is empty after refreshing, the database isn't connected:
open **Settings → Environment Variables**, check that `KV_REST_API_URL` and `KV_REST_API_TOKEN` exist, then redeploy.
The **Logs** tab will also show `[db] No Upstash Redis env vars found` in that case.

## 4. Share it

- Copy the URL from the project page; that's the link for the email.
- Optional: **Settings → Domains** lets you pick a nicer name such as `finance-quest.vercel.app` (if it's free).

## Updating the site later

Every `git push` to `main` redeploys automatically within a minute or two.

- **Questions:** edit the JSON files in `content/` (see [`content/README.md`](content/README.md)), commit, push.
- **Problems in the content** (bad answer letter, missing choices…) never crash the site: they're skipped and
  listed under **Settings → content warnings** in the app.

## Good to know

- **Weekly reset is automatic.** Each Monday 00:00 UTC the app starts a new database key; Redis deletes the old
  week's data a day later. Nothing to schedule.
- **Accounts are per browser.** There are no passwords: a student's browser keeps a secret token. Clearing browser
  data or switching devices means picking a new name (until the weekly reset frees the old one).
- **Costs:** the free tiers are far more than a class needs. You can watch usage in the Upstash dashboard.
- **Local development** needs no database: `npm install && npm run dev` stores data in `.data/db.json`.

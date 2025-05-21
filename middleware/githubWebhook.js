// /middleware/githubWebhook.js
import axios from 'axios';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export default async function githubWebhookHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const payload = req.body;

  if (payload.ref === 'refs/heads/production') {
    const commit = payload.head_commit;
    const repo = payload.repository.name;
    const pusher = payload.pusher.name;

    const message = {
      content: `🚀 **New push to production!**
**Repo:** ${repo}
**Pushed by:** ${pusher}
**Commit:** ${commit.message}
**URL:** ${commit.url}
**Time:** ${new Date(commit.timestamp).toLocaleString()}`
    };

    try {
      await axios.post(DISCORD_WEBHOOK_URL, message);
    } catch (err) {
      console.error('Failed to post to Discord:', err.message);
    }
  }

  res.sendStatus(200);
}

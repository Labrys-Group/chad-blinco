import pkg from "@slack/bolt";
const { App } = pkg;
import "dotenv/config";

const app = new App({
  appToken: process.env.SLACK_APP_TOKEN!,
  token: process.env.SLACK_BOT_TOKEN!,
  socketMode: true,
});

app.command("/hey", async ({ ack, client }) => {
  console.log(client);
  await ack({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `i'm like hey whats up hello`,
        },
      },
    ],
    response_type: "in_channel", // change to "in_channel" to make it visible to others
  });
});

app.start().catch((error) => {
  console.error(error);
  process.exit(1);
});

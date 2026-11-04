require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

app.command("/nixi-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

const möglichkeiten = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors"
};

app.command("/nixi-rock-paper-scissors", async ({ command, ack, respond }) => {
  await ack();

  await respond({
    response_type: "ephemeral",
    text: "Rock Paper Scissors",
    blocks:[
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: "Choose your move:"
            }
        },
        {
            type: "actions",
            elements: Object.entries(möglichkeiten).map(([key, label]) => ({
                type: "button",
                text: {
                    type: "plain_text",
                    text: label
                },
                action_id: `rps_${key}`,
                value: key
            }))
        }
    ]
  });
});

app.action(/^rps_(rock|paper|scissors)$/, async ({ ack, body, respond }) => {
    await ack();

    const playerChoice = body.actions[0].value;

    const options = Object.keys(möglichkeiten);
    const randomChoice = options[Math.floor(Math.random() * options.length)];

    let result;
    if (playerChoice === radomChoice) {
        result = "It is a tie";
    } else if ((playerChoice === "rock" && radomChoice === "scissors") || (playerChoice === "paper" && radomChoice === "rock") || (playerChoice === "scissors" && radomChoice === "paper")) {
        result = "You Win";
    } else {
        result = "Bot Wins";
    }
    
    await respond({
        replaceoriginal: true,
        text: `Rock Paper Scissors: ${result}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `You chose *${möglichkeiten[playerChoice]}* and the bot chose *${möglichkeiten[radomChoice]}*.\n\n*Result:* ${result}`
                }
            }
        ]
    });
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();
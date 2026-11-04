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
    if (playerChoice === randomChoice) {
        result = "It is a tie";
    } else if ((playerChoice === "rock" && randomChoice === "scissors") || (playerChoice === "paper" && randomChoice === "rock") || (playerChoice === "scissors" && randomChoice === "paper")) {
        result = "You Win";
    } else {
        result = "Bot Wins";
    }
    
    await respond({
        replace_original: true,
        text: `Rock Paper Scissors: ${result}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `You chose *${möglichkeiten[playerChoice]}* and the bot chose *${möglichkeiten[randomChoice]}*.\n\n*Result:* ${result}`
                }
            }
        ]
    });
});

const crypto = require("node:crypto");

const tttGames = new Map();
const tttWins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function tttWinner(board) {
    for (const [a, b, c] of tttWins) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return board[a];;
        }
    }

    return board.every(Boolean) ? "draw" : null;
}

function tttButton(text, action_id, value) {
    return {
        type: "button",
        text: {type: "plain_text", text},
        action_id,
        value
    };
}

function tttBlocks(game) {
    const winner = tttWinner(game.board);
    const playerX = `<@${game.playerX}>`;
    const playerO = game.playerO ?`<@${game.playerO}>` : "Bot";

    let status;

    if (winner === "draw") {
        status = "Its a draw again T-T";
    } else if (winner === "X") {
        status = `${playerX} Wins!`;
    } else if (winner === "O") {
        status = `${playerO} Wins!`;
    } else {
        status = `${game.turn === "X" ? playerX : playerO}`;
    }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Nixi-Bot Tic-Tac-Toe*\n\nX ${playerX}\nO ${playerO}\n\n${status}`
}
    }
  ];

  for (let row = 0; row < 3; row++) {
    const elements = [];

    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const symbol = game.board[index];

      elements.push(
        tttButton(
          symbol === "X" ? "X" : symbol === "O" ? "O" : "□",
          `nixi_ttt_cell_${index}`,
          game.id)
      );
    }

    blocks.push({
      type: "actions",
      block_id: `ttt_${game.id}_${game.version}_${row}`,
      elements
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      tttButton("Play Again", "nixi_ttt_restart", game.id)
    ]
  });

  return blocks;
}

function createTttGame(playerX, playerO, channel) {
  const game = {
    id: crypto.randomUUID(),
    playerX,
    playerO,
    channel,
    ts: null,
    board: Array(9).fill(null),
    turn: "X",
    version: 0,
    busy: false
  };

  tttGames.set(game.id, game);
  return game;
}

async function updateTttGame(client, game) {
  game.version++;

  await client.chat.update({
    channel: game.channel,
    ts: game.ts,
    text: "Nixi Tic-Tac-Toe",
    blocks: tttBlocks(game)
  });
}

function botTttMove(game) {
  const empty = game.board    .map((cell, index) => cell === null ? index : -1)
    .filter(index => index !== -1);

  if (empty.length === 0) return;

  const choice = empty[Math.floor(Math.random() * empty.length)];
  game.board[choice] = "O";
}

app.command("/nixi-game", async ({ ack, respond }) => {
  await ack();

  await respond({
    response_type: "ephemeral",
    text: "Nixi Game Center",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Nixi-Bot Game Center*\nChoose your Tic-Tac-Toe mode:"
        }
      },
      {
        type: "actions",
        elements: [
          tttButton(
            "Play vs Nixi-Bot",
            "nixi_ttt_solo",
            "solo"
          ),
          {
            type: "users_select",
            action_id: "nixi_ttt_multiplayer",
            placeholder: {
              type: "plain_text",
              text: "Choose opponent"
            }
          }
        ]
      }
    ]
  });
});

app.action("nixi_ttt_solo", async ({ ack, body, client }) => {
  await ack();

  const game = createTttGame(body.user.id, null, body.channel.id);

  try {
    const message = await client.chat.postMessage({
      channel: game.channel,
      text: "Nixi Tic-Tac-Toe",
      blocks: tttBlocks(game)
    });

    game.ts = message.ts;
  } catch (error) {
    tttGames.delete(game.id);
    throw error;
  }
});

app.action("nixi_ttt_multiplayer", async ({ ack, body, action, client, respond }) => {
  await ack();

  const opponent = action.selected_user;
  const player = body.user.id;

  if (opponent === player) {
    await respond({
      response_type: "ephemeral",
      text: "X You cannot play against yourself!"
    });
    return;
  }

  if (!opponent) return;

  const game = createTttGame(player, opponent, body.channel.id);

  try {
    const message = await client.chat.postMessage({
      channel: game.channel,
      text: "Nixi Tic-Tac-Toe",
      blocks: tttBlocks(game)
    });

    game.ts = message.ts;
  } catch (error) {
    tttGames.delete(game.id);
    throw error;
  }
});

app.action(/^nixi_ttt_cell_[0-8]$/, async ({ ack, body, action, client }) => {
  await ack();

  const game = tttGames.get(action.value);
  if (!game || !game.ts || game.busy) return;

  const index = Number(action.action_id.split("_").pop());
  const user = body.user.id;
  const winner = tttWinner(game.board);

  if (winner || game.board[index] !== null) return;

  const currentPlayer = game.turn === "X"
    ? game.playerX    : game.playerO;

  if (user !== currentPlayer) return;

  game.busy = true;

  try {
    game.board[index] = game.turn;

    if (!tttWinner(game.board)) {
      if (game.playerO === null) {
        botTttMove(game);
        game.turn = "X";
      } else {
        game.turn = game.turn === "X" ? "O" : "X";
      }
    }

    await updateTttGame(client, game);
  } finally {
    game.busy = false;
  }
});

app.action("nixi_ttt_restart", async ({ ack, body, action, client }) => {
  await ack();

  const game = tttGames.get(action.value);
  if (!game || !game.ts || game.busy) return;

  const user = body.user.id;

  if (user !== game.playerX && user !== game.playerO) return;

  game.busy = true;

  try {
    game.board = Array(9).fill(null);
    game.turn = "X";

    await updateTttGame(client, game);
  } finally {
    game.busy = false;
  }
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();
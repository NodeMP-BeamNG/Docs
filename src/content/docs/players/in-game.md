---
title: In the game
description: The session panel and the player list, the chat, NodeMP's keys, and how to leave a server.
---

NodeMP's interface in the game is the session panel and the chat. Their labels are in English unless BeamNG.drive is set to Russian.

## The session panel

The panel in a corner of the screen shows the server's name, your ping (*24 ms*) and the number of players (*7/16 players*). Move it in the game's UI layout editor.

Click the player count or press `Tab` to open the list with each player's ping. A player who lost connection is marked with an icon; on your screen, their cars are stopped and see-through.

Click another player's row for **Spectate** (you ride in their car as a passenger) and **Teleport camera** (the free camera moves 7 meters behind their car and 3 meters above it). Neither works in a strict session ([Settings](/players/settings/#the-nodemp-tab-in-the-game)).

A lime tab with a number to the left of the panel counts other players' cars waiting for you to accept them. Click it to build them at once ([Other players' new cars and changes](/players/settings/#other-players-new-cars-and-changes)).

## Chat

`T` opens the chat; Enter sends a line and keeps the chat open. Esc, or Enter on an empty line, closes it. The up and down arrows bring back earlier lines. While the chat is open, your car ignores the keyboard.

A line you send is pale at first, marked *sending…*, and turns normal when the server confirms it. With no confirmation within five seconds, you see *Not delivered: the server did not answer.* If the server refuses the line, the reason replaces it: you write too often, you are muted, the filter caught it, or a server plugin rejected it. A line longer than the server allows isn't sent; the mod writes *Not sent: the message is too long.*

Lines starting with `/` are commands for the server's plugins; the host knows which exist. A command no plugin takes shows for everyone as an ordinary line. Color text with codes such as `^1` and `^#RRGGBB` (all codes: [Chat and commands](/plugins/chat/)).

Set how the chat looks in the **Chat** section of the NodeMP tab ([Settings](/players/settings/#the-nodemp-tab-in-the-game)).

## Keys

Change the keys in the game's controls settings, where NodeMP's actions start with *NodeMP:*.

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Opens the chat. |
| `Tab` | NodeMP: Player list | Shows or hides the player list. |
| not bound | NodeMP: Settings | Opens the NodeMP tab. |
| not bound | NodeMP: Load scheduled changes | Builds all waiting cars of other players at once. |
| not bound | NodeMP: Diagnostics window | Opens the diagnostics window. |
| not bound | NodeMP: Toggle debug chat | Shows or hides the overlay window with the chat. |
| not bound | NodeMP: Join grabbed node (alias) | Repeats the game's own node grabber action (middle mouse by default): while you hold a node, links it to the node under the cursor or pins it to the world. |

## Leave

Press and hold **Leave** on the session panel until the button fills, then let go. The game returns to the main menu, but the launcher window doesn't come back by itself: click the NodeMP icon in the Windows notification area. You can't switch servers from inside the game; pick one in the launcher.

If the server ends the session, the launcher comes back with the reason ([You got dropped](/players/troubleshooting/#you-got-dropped)). If the connection drops, the launcher tries to put you back on the server ([When the connection drops](/players/connection/#when-the-connection-drops)).

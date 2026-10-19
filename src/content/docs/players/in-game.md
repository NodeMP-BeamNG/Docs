---
title: In the game
description: The session panel and the player list, the chat, NodeMP's keys, and how to leave a server.
---

NodeMP's interface in the game is the session panel and the chat. Their labels follow the game's language: Russian if BeamNG.drive is set to Russian, English otherwise.

## The session panel

The panel in a corner of the screen shows the server's name, your ping (*24 ms*) and the number of players (*7/16 players*). You can move the panel in the game's UI layout editor.

Click the number of players or press `Tab` to open the list with each player's ping. A player who has dropped out of contact is marked with an icon: on your screen, their cars are stopped and see-through.

Click another player's row to open the buttons **Spectate** (you get into their car as a passenger) and **Teleport camera** (the free camera moves to a point seven metres behind their car and three metres above it). In a strict session neither button works ([Settings](/players/settings/#the-nodemp-tab-in-the-game)).

If a lime tab with a number slides out to the left of the panel, that many cars of other players are waiting for you to accept them. Click the tab to build them at once ([Other players' new cars and changes](/players/settings/#other-players-new-cars-and-changes)).

## Chat

`T` opens the chat, Enter sends a line and the chat stays open. Esc, or Enter on an empty line, closes it. The up and down arrows bring back what you sent before. While the chat is open, your car doesn't respond to the keyboard.

A line you send is pale at first, marked *sending…*, and turns normal when the server confirms it. If there is no confirmation within five seconds, you see *Not delivered: the server did not answer.* If the server didn't accept the line, the reason replaces it: you are writing too often, you are muted, the filter didn't let the line through, or a server plugin rejected it. The mod doesn't send a line that is longer than the server allows, and writes *Not sent: the message is too long.*

Lines that start with `/` are commands of the server's plugins; the host knows which commands exist. A command that no plugin takes shows up for everyone as an ordinary line. You can colour text with codes such as `^1` and `^#RRGGBB` (all the codes: [Chat and commands](/plugins/chat/)).

You set how the chat looks in the **Chat** section of the NodeMP tab ([Settings](/players/settings/#the-nodemp-tab-in-the-game)).

## Keys

Change the keys in the game's controls settings. NodeMP's actions are named in English and start with *NodeMP:*.

| Default | Action | What it does |
|---|---|---|
| `T` | NodeMP: Chat | Opens the chat. |
| `Tab` | NodeMP: Player list | Shows or hides the player list. |
| not bound | NodeMP: Settings | Opens the NodeMP tab. |
| not bound | NodeMP: Load scheduled changes | Builds all waiting cars of other players at once. |
| not bound | NodeMP: Diagnostics window | Opens the diagnostics window. |
| not bound | NodeMP: Toggle debug chat | Shows or hides the overlay window with the chat. |

## Leave

Press and hold **Leave** on the session panel until the button fills, then let go. The game returns to the main menu. The launcher window doesn't appear by itself: open it by clicking the NodeMP icon in the Windows notification area. You can't switch to another server from inside the game; you pick one in the launcher.

If the server ended the session, the launcher window comes back by itself and shows the reason in a *Session ended* notification ([You got dropped](/players/troubleshooting/#you-got-dropped)). If the connection is lost, the launcher tries to put you back on the server ([When the connection drops](/players/connection/#when-the-connection-drops)).

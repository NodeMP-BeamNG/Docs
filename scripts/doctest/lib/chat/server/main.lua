-- A stand-in for the `chat` example resource, for the doctests only.
--
-- The plugin guides tell the reader to install `chat` beside their resource: player:tell,
-- node.chat.say and node.commands.add all speak through it. The example itself lives in the
-- NodeMP sources, so this speaks the protocol the guides document instead of copying it:
--
--   client -> server   chat:send   JSON { scope = "global" | "local", text }
--                      a text starting with "/" is a command: published on the bus as
--                      chat:command { pid, name, args, raw } (name lower-cased, without the
--                      slash; args the remaining words; raw the whole line) and never broadcast;
--                      anything else is broadcast as chat:msg { scope, fromPid, name, text }
--   bus                chat:say    { text, pid? } -- what node.chat.say, node.chat.tell and
--                      player:tell emit -- becomes chat:msg { scope = "system", fromPid = -1,
--                      name = "System", text } to that player, or to everyone without pid
--
-- No local scope (there is no dimensions module here) and no sanitising beyond a length cap:
-- the doctests check the examples' side of the protocol, not the chat itself.

local MAX_LEN = 256

node.bus.on("chat:say", function(_, data)
    local d = node.json.decode(data)
    if type(d) ~= "table" or type(d.text) ~= "string" or d.text == "" then return end
    local payload = { scope = "system", fromPid = -1, name = "System", text = d.text:sub(1, MAX_LEN) }
    local pid = tonumber(d.pid)
    if pid == nil or pid == -1 then
        node.broadcast("chat:msg", payload)
    else
        node.send(pid, "chat:msg", payload)
    end
end)

node.on("chat:send", function(player, data)
    local msg = node.json.decode(data)
    if type(msg) ~= "table" or type(msg.text) ~= "string" then return end
    local text = msg.text:sub(1, MAX_LEN)
    if text == "" then return end
    if text:sub(1, 1) == "/" then
        local name, rest = text:match("^/(%S+)%s*(.*)$")
        if not name then return end
        local args = {}
        for word in rest:gmatch("%S+") do args[#args + 1] = word end
        node.bus.emit("chat:command", { pid = player.id, name = name:lower(), args = args, raw = text })
        return
    end
    node.broadcast("chat:msg", {
        scope = msg.scope == "local" and "local" or "global",
        fromPid = player.id,
        name = player.name or ("Player" .. player.id),
        text = text,
    })
end)

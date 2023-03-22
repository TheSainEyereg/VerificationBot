

function syncWhitelist() {}

function overdueCheck() {} // verify.state !== States.OnConfirmation && Date.now() > verify.openUntil

function unmuteCheck() {} // Date.now() > verify.mutedUntil

function unbanCheck() {} // Date.now() > user.bannedUntil

module.exports = { syncWhitelist, overdueCheck, unmuteCheck, unbanCheck }
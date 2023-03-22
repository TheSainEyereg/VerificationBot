const Colors = {
	Regular: 0xc4e85f,
	Url: 0x1194f0,
	Success: 0x44e838,
	Warning: 0xe5e838,
	Critical: 0xe83838,
	Question: 0x1a5fc7
};

const States = {
	ShouldEnd: -1,
	OnText: 0,
	OnQuiz: 1,
	OnPassword: 2,
	OnConfirmation: 3
};

module.exports = { Colors, States }
var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
var sendGrid	= require('./../helpers/sendgrid');

/****************************************************/
/*		Etusivun yhtedenotto lomakkeen stufut		*/
/****************************************************/
var contactRequestSchema = new Schema({
	timestamp:	Date,			// Koska otettu yhteyttä
	ynimi: 		{type: String, default:""},
	ytunnus: 	{type: String, default:""},
	katuos: 	{type: String, default:""},
	postinum: 	{type: String, default:""},
	paikka: 	{type: String, default:""},
	nimi: 		{type: String, default:""},
	titteli: 	{type: String, default:""},
	puh: 		{type: String, default:""},
	sposti: 	{type: String, default:""},

}, { minimize: false });

contactRequestSchema.pre('save', function(next){
	this.timestamp = new Date();
	next();
});

contactRequestSchema.post('save', function(doc){
	console.log("contactRequest saved", doc)
	sendGrid.sendContactRequest(doc)
});

// Node exportit
var contactRequest = mongoose.model("ContactRequest", contactRequestSchema);
module.exports = contactRequest;
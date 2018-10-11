var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;

/****************************************************/
/*				SivuBuilder							*/
/****************************************************/
var siteBuilderSchema = new Schema({
	
	name:String,
	
	templates: [{
		name: 			String,
		description: 	String,
		jadefile:		String,
	}],

	
}, { minimize: false });


// Node exportit
var cp = mongoose.model("SiteBuilder", siteBuilderSchema);
module.exports = cp;
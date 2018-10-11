var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;


/****************************************************/
/*		Asiakkaan julkinen sivu Schema				*/
/****************************************************/
var customerPageSchema = new Schema({
	
	// Sivustoon kirjatuminen
	login: {
		username: 	{type:String, default:""},
		pwd:		{type:String, default:""},
	},
	
	layout: {type:String, default:"default"},	// Mitä layouttia sivu käyttää.
	
	// Kampanjan meta tiedot
	meta: {
		campaign: {		
			name:	String,
			id:		Schema.Types.ObjectId,
			
			// Luodaan inputboxit näiden perusteella
			keys: [{										
				name:		String,
				enabled:	{type:Boolean, 	default:true},
				type:		{type:String, 	default:"text"}, // inputboxin type
			}],
		},
		
		// Soittoyrityksen meta tiedot
		client: {		
			name:	String,
			id:		Schema.Types.ObjectId,
		},
		
		customer: {
			name:	String,
			id: 	Schema.Types.ObjectId,
		},
	},
	
	// Sivuston kustomisaatiot, käytetään Telenian omaa css jossei ole arvoa määritetty.
	customizations: {	
		pageBody: {
			class:		{type:String, default:""},
			title:		{type:String, default:"Telenia.fi"},
			background:	{type:String, default:"#ffffff"},
			color:		{type:String, default:"#666666"},
		},
		title: {
			class: 	{type:String, default:""},
			text: 	{type:String, default:"Sivuston otsikko"},
			color:	String,
			
		},
		footer: {
			class: 	{type:String, default:""},
			text: 	{type:String, default:"Sivuston alaotsikko"},
			color:	String,
		},
		logo: {
			class: 	{type:String, default:""},
			url: 	{type:String, default:"/images/logo_pieni.png"},
		},
		help: {
			class: 	{type:String, default:""},
			text: 	{type:String, default:"Toiminta ohjeet asiakkaille"},
			color:	String,
		},
		form: {
			legend:{
				class: 	{type:String, default:""},
				text: 	{type:String, default:"Lomakkeen otsikko"},
				color:	String,
			},
			inputs: [{
				class: 			{type:String, default:""},
				name:			String,
				value:			String,
				placeholder:	String,
				color:			String,
			}],
		},
	},
	created: 	{type:Date, default: new Date()},	// Koska sivu luotu
}, { minimize: false });


// Node exportit
var cp = mongoose.model("CustomerPageSchema", customerPageSchema);
module.exports = cp;
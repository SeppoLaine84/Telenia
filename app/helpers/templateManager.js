  
/***************************************
		  TEMPLATE MANAGER
***************************************/ 
var templateManager = function(readyCB){
	var _self 			= this;
	_self.templates 	= {};						// Valmiit sivu templatet
	
	/************************************************************************* 	
		options:
			name 		Templaten nimi
		callback:
			err 		alauttaa virhe viestin, null jos ei ole virheitä.
			template 	Löydetty template 
	*************************************************************************/
	_self.findTemplate = function(options, callback){		
		
		var err 		= null;
		var template 	= null;
		
		if(_self.templates[options.name])
			template = _self.templates[options.name];
		else
			err = {msg: "Haettua sivupohjaa ei löytynyt."};
		
		callback(err, template);
	};
	
	var getTemplates = function(){
		console.log("getting templates");	
		$.ajax({
			url:"/sitebuilder/templates/list",
			type:"POST",
			dataType:"JSON",
			success:function(templates){
				console.log("got templates: ", templates);	
				_self.templates = templates;
				readyCB(_self.templates);
			}
		})
	} 
	getTemplates();
}

module.exports = templateManager;
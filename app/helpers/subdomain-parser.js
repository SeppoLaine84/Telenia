module.exports = {
	
	parse: function(domain) {
		 
		var	subDomain = domain.split('.');
		 
		if(subDomain.length > 2){
			subDomain = subDomain[0];
		}else{
			subDomain = "global";
		}
		
		return subDomain;
	},
	 
};
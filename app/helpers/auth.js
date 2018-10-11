 var log			= require('winston')
	, domainParser 	= require('../helpers/subdomain-parser')
	, jade			= require('jade');


module.exports = {

	authAdmin: function (req, res, next) {	// Superadminin authit
		//subDomain = domainParser.parse(req.headers.host);
		if(req.session){
			if (req.session.user) {
				if(req.session.user.userlevel)
					if(req.session.user.userlevel == 4)
						next();
			}
		}  
		else {
			//log.add("Oikeudeton sivun lataus");
			var html = jade.compileFile('blocks/login');
			res.send(html);
		}
	},
	
	loginCheck: function(req, res, next) {
		if (req.session.authenticated) {
			if (req.session.user) {
				next();
			} 
			else {
				res.redirect("/login");
			}
		} 
		else {
			//log.add("Oikeudeton sivun lataus");
			res.redirect("/login");
		}
	},
	salesManagerCheck: function(req, res, next) {
		if (req.session) {
			if (req.session.user) {
				if (req.session.user.userlevel >= 2) {
					next();
				}
				else {
					res.redirect("/");
				}
			}
			else {
				res.redirect("/");
			}
		} 
		else {
			//log.add("Oikeudeton sivun lataus");
			res.redirect("/");
		}
	},
	masterUserCheck: function(req, res, next) {
		if (req.session) {
			if (req.session.user) {
				if (req.session.user.userlevel == 3) {
					next();
				}
				else {
					res.redirect("/");
				}
			}
			else {
				res.redirect("/");
			}
		} 
		else {
			//log.add("Oikeudeton sivun lataus");
			res.redirect("/");
		}
	},
	
};
var crypto 	= require('crypto') ;

var salt 		= "ruokasuolaa";
var algorithm 	= 'aes-256-ctr';
var password 	= 'hashpwd!';

module.exports = {
	
	
	cryptPWD: function(input){
		var hash = crypto.createHash('sha256').update(salt+input+salt).digest('base64');
		return hash;
	},

	encrypt: function(text){
		var cipher = crypto.createCipher(algorithm, password)
		var crypted = cipher.update(text,'utf8','hex')
		crypted += cipher.final('hex');
		return crypted;
	},
 
	 decrypt: function(text){
		var decipher = crypto.createDecipher(algorithm, password)
		var dec = decipher.update(text,'hex','utf8')
		dec += decipher.final('utf8');
		return dec;
	}
	
}
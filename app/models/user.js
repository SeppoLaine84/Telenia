var mongoose 	= require('mongoose');
var crypter 	= require("./../helpers/crypter");
var Schema 		= mongoose.Schema;

var appSettings	= require("./../../settings");
var moment		= require("moment");



/****************************************************/
/*				Käyttäjä Schema						*/
/****************************************************/
var userSchema = new Schema({
	
	email:			{type:String, index: { unique: true }},
	pwd:			String,
	userlevel:		Number,
	lastLogin: 		Date,
	clientID:		Schema.Types.ObjectId,
	clientName: 	String,
	notifySales:	{type:Number, default: 1},
	pwdResetHash: 	{type:String, default:""},
	raportti:		{ 										// Käyttäjän raportit ja kuittaukset
		luotu:		{type: Date, default: Date.now},		// Raportin luonti aika
		kuittaukset: [{
			aika:		Date,		// Kuittauksen aika
			aikaShort: 	String,
			aikaUnux:	Number,
			data:		String,
			kampanjaID:	Schema.Types.ObjectId,					// Kampanjan 		ID
			ciID:		Schema.Types.ObjectId,					// KampanjaItemin 	ID
			payloadName:{type:String, default: ""},
			kuitattu: 	{type:Boolean, default:false},
		}],
	},	
	
	yhteystiedot:{
		nimi: {
			etu:	{type: String, default:""},
			suku:	{type: String, default:""},
		},
		osoite:{
			katu:			{type: String, default:""},
			katuLisarivi:	{type: String, default:""},
			postinro:		{type: String, default:""},
			kunta:			{type: String, default:""},
		},
		puhelin: {type: String, default:""}
	},
	
	palkka:{
		provisiopalkka: {type: String, default:"0.00"},
		kuukausipalkka: {type: String, default:"0.00"},
		tuntipalkka: 	{type: String, default:"0.00"},
		palkkaTyyppi:	{type: Number, default:0},
		provisioEnabled:{type: Boolean, default:false},
		palkkaHistoria:[{	// Vanhat palkat tallennetaan tänne
			aika:			Date,
			provisiopalkka: String,
			kuukausipalkka: String,
			tuntipalkka: 	String,
		}],
		
		bonuses:[{
			aika:		Date,
			summa: 		String,
			bonusDesc:	String,
		}],
		
	},
	uiOptions: {
		etusivu: {
			widgets: {
				statList: {
					show: 			{type:Number, default: 1},
					minUserlevel:	{type:Number, default: 2},
					position: 		{type:Number, default: 0},
					showAnimtion:	{type:String, default: "fadeInDown"},
				},
				timespanChart: 	{
					show: 			{type:Number, default: 1},
					minUserlevel:	{type:Number, default: 1},
					position: 		{type:Number, default: 1},
					showAnimtion:	{type:String, default: "fadeInDown"},
				},
				callProgressPie: {
					show: 			{type:Number, default: 1},
					minUserlevel:	{type:Number, default: 1},
					position: 		{type:Number, default: 2},
					showAnimtion:	{type:String, default: "fadeInDown"},
				},
				kuittausFeed: 	{
					show: 			{type:Number, default: 1},
					minUserlevel:	{type:Number, default: 1},
					position: 		{type:Number, default: 3},
					showAnimtion:	{type:String, default: "fadeInDown"},
				},
				
				weeklyUserChart:{
					show: 			{type:Number, default: 1},
					minUserlevel:	{type:Number, default: 1},
					position: 		{type:Number, default: 4},
					showAnimtion:	{type:String, default: "fadeInDown"},
				},
				weeklyChart: 	{
					show: 			{type:Number, default: 1},
					minUserlevel:	{type:Number, default: 1},
					position: 		{type:Number, default: 5},
					showAnimtion:	{type:String, default: "fadeInDown"},
				},
				
			
			}
			
		}
		
	},
	aktiivinen: 	{type:Number, default:1},
	liitetytKampanjat: [Schema.Types.ObjectId],

}, { minimize: false, autoIndex:true });



/****************************************************/
/*				Käyttäjä kohtaiset funktiot			*/
/****************************************************/

// Hakee userin yhtiön
userSchema.methods.getClient = function(cb) {
	this.model("Client").findOne({_id: this.clientID}, cb);
};


// Vaihtaa userin salasanan
userSchema.methods.setPassword = function(newpwd, cb) {
	this.pwd = crypter.cryptPWD(newpwd);
	this.save(cb);
};



/****************************************************/
/*				Yleiset funktiot					*/
/****************************************************/



// Hakee userin emailin perusteella
userSchema.statics.findUser = function(user, cb) {
	return this.model("User").findOne({ email: new RegExp(user, 'i') }, cb);
};

// Hakee userin ID:n perusteella
userSchema.statics.findUserByID = function(userID, cb) {
	return this.model("User").findById( userID , cb);
};

// Poistaa userin emailin perusteella
userSchema.statics.removeUser = function(user, cb) {
	this.model("User").find({ email: new RegExp(user, 'i') }, function(er, cb){
		cb.forEach(function(usr){
			usr.remove();
		})
	});
	return true;
};

// Poistaa userin emailin perusteella
userSchema.statics.removeUserByID = function(user, _cb) {
	this.model("User").findById(user, function(er, cb){
	
		if(cb)
			cb.remove();
		if(_cb)_cb();
	});
	return true;
};

// Hakee kaikki userit (superadmin)
userSchema.statics.getUsers = function(cb) {
	return this.model("User").find({}, cb);
};


// Luo uuden userin
userSchema.statics.createUser = function(email,pwd,userlevel,cb){
		
	var usr = new this({email:email,pwd:crypter.cryptPWD(pwd), userlevel:userlevel});
	
	usr.save(function(err, status){
		if(err)cb(err);
		//console.log("user save status: ", err,status);
		else if(cb)cb(status);
		
	});
	
};

userSchema.statics.clearAllReportItems = function(cb){
	this.model("User").find({}, function(err, users){
		var left = users.length;
		users.forEach(function(user){
			user.raportti.kuittaukset = [];
			
			left--;
			if(left == 0)
				user.save(cb);
			else
				user.save();
		})
	})
}




/****************************************************/
/*				Node exports						*/
/****************************************************/
var User = mongoose.model("User", userSchema);
module.exports 	= User;
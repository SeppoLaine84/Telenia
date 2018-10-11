var socket = function(server){
	
	var appSettings		= require("./../../settings");
	
	var _io = require('socket.io')();
	var utils = require('socket.io-utils')(_io);
	var io 				= _io.listen(server);
	var log				= require('./../helpers/log');
	var Log				= require('./../models/log');
	var User 			= require('./../models/user');
	var Client 			= require('./../models/client');
	var Customer		= require('./../models/customer');
	var Notify			= require('./../models/notify');
	var CI				= require('./../models/campaignItem');
	var Campaign		= require('./../models/campaign');
	var Report			= require('./../models/report');
	var Kuittaus		= require('./../models/kuittaus');
	var systemLog		= require('./../models/system');
	var errorLog		= require('./../models/errorGrid');
	var _ 				= require('underscore');
	var events 			= require('./events');
	var mongo 			= require('mongodb');
	var ObjectId 		= mongo.ObjectID;
	var moment			= require('moment');
	var crypter			= require('./crypter');
	var os 				= require("os");
	var hostname 		= os.hostname();	
	
	/////////////////////////////////////////////////
	// 			  SOCKET  REDIST
	// 				 CLUSTERI
	/*var redis	= require("redis");
	var pub 	= redis.createClient(6379, "telenia-local");
	var sub 	= redis.createClient(6379, "telenia-local", { return_buffers: true});
	pub.auth("tämä oli vaarallista touhua!");
	sub.auth("tämä oli vaarallista touhua!!");
	var adapter = require('socket.io-redis');
	io.adapter(adapter({ pubClient: pub, subClient: sub }));
	*/
	
	/*********************/
	//		SOCKET
	/*********************/
	var socketClients 	= [];

	var rooms			= [];
	var room = function(name) {
		this.name 	= name;
		this.users 	= [];
	}

	function emitToUser(userID, req, data){
		
		socketClients.forEach(function(cli){
			
			if(cli.userID  == userID) {
				cli.emit(req, data)
			}
				
		})
	}
	
	// Notifyn lähettäminen käyttäjälle
	function sendNotifyToUser(client, notify) {
		client.emit("NOTIFY", notify);
	}

	function sendUnreadNotifysToUser(client) {
		
		Notify.getUnread(client.user._id, function(err, unreadNotifys){
			
			if(unreadNotifys){
				unreadNotifys.forEach(function(notify){
					sendNotifyToUser(client, notify);
				});
			}
		});
	}

	events.on("NEW NOTIFY", function(data){
		
		socketClients.forEach(function(cli){
			
			if(cli.userID  == data.userID){
				Notify.findById(data.notifyID, function(err, notify){
					sendNotifyToUser(cli, notify);
				})
			}
				
		})
	})
	
	events.on("pm2.send.info", function(descs){

		if (io.sockets.connected[descs.socketID]) {
			io.sockets.connected[descs.socketID].emit("pm2.info", descs);
		}
	})
	
	events.on("kuittaus.save", function(data){
		io.sockets.in(data.clientID.toString()+"_lvl2").emit('kuittaus.send', {clearElement:false ,kuittaukset: [data]});
	});
	
	
	events.on("user.attach", function(data){
		emitToUser(data.data.userID, "user.attach", data);
	});
	
	events.on("user.logout", function(data){
		io.sockets.in("admin").emit("USERLEFT", data)
	});
	
	
	log.on('logging', function (transport, level, msg, meta) {
		if(transport.name == "file")
			if(_.contains(["info", "error", "kuittaus", "kampanja"], level))
				io.sockets.in("admin").emit('admin.log.stream',  {docs:[{cluster:hostname, level:level, message:msg, timestamp: new Date()}]});
	});
	
	io.on("connection", function(client){
		
		
		client.on("LOGIN", function(email){
			
			User.findOne({email:email}, "-raportti", function(err,user){
				
				if(err)log.log("error", err)
				client.handshake.session.socketID = client.id;
				client.handshake.session.save()
				if(user){
					if(user.userlevel < 4){
						Client.findById(user.clientID, "nimi").lean().exec(function(err, clientName){
							user.socketID 		= client.id;
							user.userID 		= (user._id).toString();
					
							client.user 		= user;
							client.userID 		= (user._id).toString();
							client.email		= user.email;
							client.user.clientName 	= clientName.nimi;
							
							client.user.socketID = client.id.toString();
							socketClients.push(client);
					
							client.emit("USERINFO", client.user);

						});
					}
					else {
							user.socketID 		= client.id;
							user.userID 		= (user._id).toString();
					
							client.user 		= user;
							client.userID 		= (user._id).toString();
							client.email		= user.email;
							client.user.clientName 	= "Codalia";
							
							client.user.socketID = client.id.toString();
							socketClients.push(client);
							
							client.emit("USERINFO", client.user);
					}
				}
				else {
					log.log("error", "Socket.login: user not found; "+email, {email:email})
				} 
				
			});
		});
		
		client.on("join", function(_room){
			if(_room)
				_room = _room.toString() || "error";
			else 
				_room = "admin";
		
			//log("","", new logEntry(client.user.clientCompanyID, "info", "socket.io", "channel join", JSON.stringify({channel:_room, username:client.user.email,userID:client.user._id, socketID:client.id, address:client.handshake.address}, null, " "),  client.user.userlevel));
			
			if(!rooms[_room])
				rooms[_room] = new room(_room);
					
			rooms[_room].users.push(client.user);
			
			
					
			client.join(_room);
			
			if(client.user.userlevel >= 2){
				client.join(_room+ "_lvl2")
			
			}
			
			client.room = _room;
			io.sockets.in("admin").emit("USERJOIN", {user:client.user, socketID:client.id})
		
			sendUnreadNotifysToUser(client);
			client.emit("joined");
			
			if(_room == "admin"){
				var allClients 	= []
				var srvSockets 	= io.sockets.sockets;
				var userCount 	= Object.keys(srvSockets).length;
				//console.log(srvSockets)
				Object.keys(srvSockets).forEach(function(_client){
				
					allClients.push({socketID: _client, user:srvSockets[_client].user})
				});
			
				client.emit("USERS", {userCount: userCount, users: allClients});
			}
		
		});
		
		
		///////////////////////////////////////////////
		//		Käyttäjän lukitus ruudun avaus 
		client.on("user.unlock.screen", function(pwd){
			if(crypter.cryptPWD(pwd.pwd) == client.user.pwd){
				client.emit({unlock:true})
			}
			else {
				client.emit({unlock:false})
			}
			
		});
		
		client.on("popupped", function(popupID){
			Notify.findById(ObjectId(popupID), function(err, notify){
				notify.setPopupped(false);
			})
		});
		
		client.on("clientERR", function(error){
			log.log("error", client.email+ "_client: "+JSON.stringify(error));
		});
		
		client.on("MSG", function(msg){
			io.sockets.in(client.room).emit('MSG', msg);
		})
		
		client.on("disconnect", function(){
			
			io.sockets.in("admin").emit("USERLEFT", {socketID:client.id});
			if(client.room) {
				if(rooms[client.room].users){
					rooms[client.room].users 	= _.without(rooms[client.room].users, _.findWhere(rooms[client.room].users, {socketID: client.id})); // poista kanavan listasta
				}
			}
			socketClients = _.without(socketClients, _.findWhere(socketClients, {id: client.id})); // poista useri aktiivisten listasta
		});

		client.on("req.campaign.active", function(data){
			client.broadcast.emit("campaign.active", data);
		});
		
		// Notify komennot
		client.on("NOTIFY REMOVE", function(id){
			
		})
		
		// Notify komennot
		client.on("NOTIFY SEND", function(data){
			var dat 	= data;
			dat.client 	= client;
			events.emit("NOTIFY SEND", data);
			
		});
		
		
		client.on("req.user.sales.widget", function(){
			
			if(client.user){
				User.findById(client.user._id).lean().exec(function(err, usr){
					var allKuittaukset 		= 0;
					var unregisteredCount 	= 0;
					var new_oks = _.filter(usr.raportti.kuittaukset, function(itm){
						
						
						if(itm.aika <= new Date() && itm.aika >= moment().locale("fi").startOf('week').toDate()) {
							allKuittaukset++
							if(itm.kuitattu == false) {
								unregisteredCount++;
							}
						}
						
						if(itm.data === "OK"){
							var startDate 	= moment().locale("fi").startOf('week').toDate()
							var endDate 	= new Date();
							
							return itm.aika <= endDate && itm.aika >= startDate;
						}
						
						
						return false;
						
					});
					var old_oks = _.filter(usr.raportti.kuittaukset, function(itm){
						if(itm.data === "OK"){
							var startDate 	= moment().subtract(1,'weeks').locale("fi").startOf('week').toDate()
							var endDate 	= moment().subtract(1,'weeks').locale("fi").endOf('week').toDate()
							
							return itm.aika <= endDate && itm.aika >= startDate;
						}
						
						return false;
						
					});
					client.emit('user.sales.widget', {newCount:new_oks.length, oldCount: old_oks.length, totalCount: allKuittaukset, unregisteredCount: unregisteredCount})
				});
			}
			else {
				client.emit('user.sales.widget', {error:"retry"})	
			}
		});
		
		
		// clientside pyytää käyttäjä listaa
		client.on("req.users.list", function(){
			
			if(client.user.userlevel >= 3){
				User.find({clientID:client.user.clientID}).select("-raportti").lean().exec(function(err, users){
					client.emit("users.list", users);
				});
			}
		});
		
		// Käyttäjän luominen
		client.on("req.user.add", function(_d){
			log.log("User", "Luodaan käyttäjä "+JSON.stringify(_d))
			if(client.user.userlevel >= 3){
				
				var usr 		= new User(_d)
				usr.clientID 	= client.user.clientID;
			
				usr.setPassword(_d.pwd, function(err,status){
					client.emit("user.created", {err:err, status:status});
				});
				
			}
			else {
				console.log("no permission")
			}
		});
		
		// clientside pyytää asiakas listaa
		client.on("req.customer.list", function(){
		
			if(client.user.userlevel >= 3){
				Customer.find({clientID:client.user.clientID}).lean().exec(function(err, customers){
					client.emit("customer.list", customers);
				});
			}
		});
		
		client.on("req.user.pwd.change", function(data){
			
			User.findById(data.id, "pwd", function(err, usr){
				usr.setPassword(data.pwd, function(err, resp){
					log.log("User", "Käyttäjän "+usr._id+" salasana on vaihdettu.")
					
				});
			});
		
		});
		
		// Asiakkaan luonti
		client.on("req.customer.add", function(data){
			var c 		= new Customer(data);
			c.clientID 	= client.user.clientID;
			c.save(function(err, status){
				io.to(client.user.clientID.toString()).emit('customer.add', {err:err, obj:status})
			});
			
		});
		
		// Asiakkaan poisto
		client.on("req.customer.del", function(data){
			Customer.remove({_id:ObjectId(data.id)}, function(err, c) {
		
				io.to(client.user.clientID.toString()).emit('customer.del', {err:err, nimi:data.nimi})
		
			});
		
			
		});
		
		/*
			RAPORTTI
			Kampajoiden listaus
		*/
		
		client.on("req.report.campaign.list", function(opts){
			
			var reportResult = {};
			
			
			Customer.find({clientID:client.user.clientID}).lean().exec(function(err, customers){
				var customersLeft = customers.length;
			
				customers.forEach(function(c){
					reportResult[c._id] = {customer:c, campaigns:{}};
					Campaign.find({customerID:c._id}).lean().exec(function(err, campaigns){
						var campaignsLeft = campaigns.length;
						
						if(campaignsLeft == 0){
							customersLeft--;
							if(customersLeft ==0){
								client.emit("report.campaign.list", reportResult)		
							}
						}
						else	
						campaigns.forEach(function(camp){
							reportResult[c._id]['campaigns'][camp._id] = {reports:[], campaign:camp}
							Report.find({kampanjaID:camp._id, date:{$gte: opts.start, $lte: opts.end}}).sort("date").exec(function(err, reports){
								
								var reportsLeft = reports.length;
								if(reportsLeft == 0){
									delete reportResult[c._id]['campaigns'][camp._id];
									campaignsLeft--;
								
									if(campaignsLeft <= 0){
										customersLeft--;
									}
								
									if(customersLeft ==0 && campaignsLeft == 0){
									
										client.emit("report.campaign.list", reportResult)		
										
									}
																												
								}else{
									reportResult[c._id]['campaigns'][camp._id].reports = reports;
									campaignsLeft--;
						
									if(campaignsLeft <= 0){
										customersLeft--;
									}
									
									
									if(customersLeft ==0 && campaignsLeft == 0){
										
										client.emit("report.campaign.list", reportResult)		
									}
								}
									
							});
	
							
						});
					});
				});
				
			});
			
			
				
		});
		
		/*
			RAPORTTI
			Myyjä listaus
		*/
		/*
		client.on("req.report.user.list", function(opts){
			var reportResult = {};
			User.find({clientID:client.user.clientID}, "-raportti").lean().exec(function(err, users){
				var usersLeft = users.length;
				
				if(usersLeft == 0){
					client.emit("report.user.list", reportResult)		
				}
				else {
					Users.forEach(function(user){
											
						reportResult[user._id] = {reports:[], campaign:{}};
						
						Report.find({userID:user._id, date:{$gte: opts.start, $lte: opts.end}}).sort("date").exec(function(err, reports){
									
							
							var reportsLeft = reports.length;
							
							if(reportsLeft == 0){
								delete reportResult[reports.userID]['campaigns'][camp._id];
								usersLeft--;
								if(usersLeft == 0){
									client.emit("report.user.list", reportResult)		
									
								}
																											
							}else{
								reportResult[c._id]['campaigns'][camp._id].reports = reports;
								campaignsLeft--;
					
								if(campaignsLeft <= 0){
									customersLeft--;
								}
								
								
								if(customersLeft ==0 && campaignsLeft == 0){
									
									client.emit("report.user.list", reportResult)		
								}
							}
								
						});

						
					});
				}
			});
		});
		*/
		
	
		/*
			ETUSIVU
			Kuittaus livefeedi
		*/
		client.on("req.client.kuittaus.feed", function(data){
			Kuittaus.find({clientID: client.user.clientID}).sort("-aika").limit(5).lean().exec(function(err, kuittaukset){
				client.emit("kuittaus.send", {clearElement:true, kuittaukset:kuittaukset});
				
			});
		});
		
		client.on("req.admin.log", function(opts) {
		
			
			Log.paginate({"level": {$in :['kuittaus', 'info','error','kampanja']}}, opts, function(err, _logs){
				
				_logs.cluster = hostname;
				
				if(opts.limit == 0){
					
					client.emit("admin.log.meta", _logs)
				}
				else if(opts.append){
				
					client.emit("admin.log.append", _logs)
				}
				else {
					
					client.emit("admin.log.initial", _logs)
				}
					
			})
		
		});
		
		client.on("req.admin.user.list", function(){
			Client.find({}).lean().exec(function(err, clients){
				var clientArr = {}
				var clientsLeft = clients.length;
				clients.forEach(function(c){
					clientArr[c._id.toString()] = {clientName: c.nimi, users:[]}
					
					User.find({clientID:c._id}, "yhteystiedot _id email clientID").lean().exec(function(err, userList){
						var usersLeft = userList.length;

						if(userList.length > 0){
							
							userList.forEach(function(usr){
								
								clientArr[usr.clientID.toString()].users.push({
									id: 	usr._id,
									nimi: 	usr.yhteystiedot.nimi.etu + " " + usr.yhteystiedot.nimi.suku,
									email:	usr.email
								});
								usersLeft--;
								
								if(usersLeft == 0) {
									clientsLeft--;
								}
								if(usersLeft == 0 && clientsLeft == 0)
									client.emit("admin.user.list", clientArr)
							})
						}else {
								clientsLeft--;
								if(clientsLeft == 0)
									client.emit("admin.user.list", clientArr)
						}
					});
				});
			});
		});
		
		client.on("req.admin.client.list", function(){
			Client.find({}).lean().exec(function(err, clients){
				client.emit("admin.client.list", clients)
			});
		});
		
		/*
			Processi infot
		*/
		
		client.on("req.admin.system.info.history", function(opts){
			var d = new Date();
			var d2 = new Date();

			d2.setMinutes(d.getMinutes() - 1);
			systemLog.find({timestamp: {$gte: d2}}).lean().exec(function(err, logs){
				
				client.emit("admin.system.info.history", logs)
			});
		});
		
		
		client.on("req.admin.process.info", function(ids){
			events.emit("pm2.get.info", {ids:ids,socketID:client.id})
			
		});
		
		
		client.on("req.admin.reports.all", function(){
			if(client.user.userlevel == 4){
				Report.find({}).lean().exec(function(err, reports){
					client.emit("admin.reports.all", reports)
				});
			}
		});
		
		// ErrorGridi listaus
		client.on("req.admin.errorGrid.list", function(){
			errorLog.find({checked:false}, function(err, errors){
				client.emit("admin.errorGrid.list", errors)
			});
		});
		
		client.on("req.admin.errorGrid.fix", function(request){
			
			errorLog.update({_id:ObjectId(request._id)},{checked:true}).exec(function(err, errors){
			
			});
		});
		
		// HitaatSivut
		client.on("req.admin.slowPage.list", function(){
			Log.find({level:"slowPage"}).lean().exec(function(err, slowPages){
				var result;
				if(slowPages.length > 0){
					result = _.groupBy(slowPages, function(itm){
						return itm.meta.url;
					})
					
				}
				client.emit("admin.slowPage.list", result)
			});
		});
		
		// Admin emaili systeemi
		client.on("req.admin.email.activity.list", function(){
			if(client.user.userlevel == 4){
				Log.find({level:"sendgrid"}).sort("-timestamp").limit(20).lean().exec(function(err, sendgrid){
					Log.find({level:"sentEmail"}).sort("-timestamp").limit(20).lean().exec(function(err, emails){
						client.emit("admin.email.activity.list", {emails:emails, sendgrid:sendgrid})
					});
				});
			}
		});
		
		client.on("req.team.orders", function(opts={limit:0}){
			Kuittaus.find({clientID: client.user.clientID, status:"OK"}).limit(opts.limit).lean().exec(function(err, kuittaukset){
				client.emit("team.orders", kuittaukset)
			})
		})
		
		client.on("req.campaignitem.payloads", function(_payloads){				
			var payloads 	= _.map(_payloads.payloads, function(pl){return ObjectId(pl);})
			CI.find({_id:{$in:payloads}}).exec(function(err, pl){
				client.emit("campaignitem.payloads", {payloads:pl});
			});
		});		
		
		client.on("req.payload.data", function(query){				
			var id = ObjectId(query.id)
			var order = query.order;
			
			CI.findById(id).exec(function(err, pl){
				client.emit("payload.data", {payload:pl, order:order});
			});
		});		
		
	});
	return io;
}
module.exports = socket;
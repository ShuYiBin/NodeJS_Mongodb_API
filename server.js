var express = require('express')
var app = express()
var bodyParser = require('body-parser')
var morgan = require('morgan')
var mongodb = require('mongodb')
var mongoose = require('mongoose')
var jwt = require('jsonwebtoken')

var config = require('./config')
var user = require('./models/user')

var port = process.env.PORT || 8080
mongoose.connect(config.database)
app.set('secret', config.secret)
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(morgan('dev'))

app.listen(port, function () {
    console.log('The server is running at http://localhost:' + port)
})

var api = express.Router()

api.post('/login', function(req, res) {
    user.findOne({
        name: req.body.name
    }, function (err, user) {
        if(err) throw err
        if(!user) {
            res.json({success: false, message: "failed"})
        } else if(user) {
            if(user.password != req.body.password) {
                res.json({success: false, message: "password error"})
            } else {
                var token = jwt.sign(user.toJSON(), app.get('secret'), {
                    expiresIn: 3600
                })

                res.json({success: true, message: 'Success', token: token})
            }
        }
    })
})

api.use(function(req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token']
    if(token) {
        jwt.verify(token, app.get('secret'), function(err, decoded) {
            if(err) return res.json({success: "false", message: "token invalid."})
            else {
                req.decoded = decoded
                next()
            }
        })
    } else {
        return res.status(403).send({success: false, message: "no token provided."})
    }
})

api.get('/users', function (req, res) {
    user.find({}, function(err, users){
        res.json(users)
    })
})

api.get('/users/:id', function (req, res) {
    console.log(req.params.id)
    var id = new mongodb.ObjectID(req.params.id)
    console.log(id)
    user.findOne({_id: id}, function(err, user1) {
        if(err) throw err
        if(!user1) res.json({success: false, message:"cant find user."})
        else res.json(user1)
    }) 
})

api.post('/register', function(req, res) {
    var name = req.body.name
    var password = req.body.password
    if(!name) return res.status(401).send({success: false, messge:"missing name"})
    if(!password) return res.status(401).send({success: false, messge:"missing password"})
    user.findOne({name: name, password: password}, function(err, user1){
        if(err) throw err
        if(!user1) {
            var register = new user({name: name, password: password})
            register.save(function(err) {
                if(err) throw err
                res.json({success: true, message: "Registered"})
            })
        } else {
            res.json({success:false, message:"Already exist."})
        }
    })
    
})

app.use('/api', api)
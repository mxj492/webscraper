var express = require("express");
var exphbs = require("express-handlebars");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var path = require("path");



var Note = require("./models/note.js");
var Article = require("./models/article.js");

var axios = require("axios");
var cheerio = require("cheerio");

mongoose.Promise = Promise;

var PORT = process.env.PORT || 3000;


var app = express();


app.use(bodyParser.urlencoded({
    extended: false
}));


app.use(express.static(path.join(__dirname, '/public')));


app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');


mongoose.connect("mongodb://user:password1@ds061621.mlab.com:61621/heroku_fq0647rf", { useNewUrlParser: true })
var db = mongoose.connection;


db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});


db.once("open", function() {
    console.log("Mongoose connection successful.");
});



app.get("/", function(req, res) {
    res.render('index');
});


app.get("/scrape", function(req, res) {
    
    axios.get("https://orlando.craigslist.org/search/web", function(error, response, html) {
        
        var $ = cheerio.load(html);
        
        $('.result-info').each(function(i, element) {
            
            var result = {};
            
            result.title = $(this).children("a").text()
            result.link = $(this).children("a").attr("href")
           
            var checkRootLink = result.link.startsWith("/")
            if (checkRootLink) {
              result.link = "https://craigslist.org" + result.link
            }
              
            var entry = new Article(result);
            
            entry.save(function(err, doc) {
              
                if (err) {
                    console.log(" already scraped" + err);
                }
                
                else {
                    console.log("Scraped  into our DB" + doc);
                }
            });

        });
    });
    
    res.redirect("/articles");
});


app.get("/articles", function(req, res) {
  
  Article.find({}, function(error, doc) {
      
      if (error) {
          console.log(error);
      }
      
      else {
          res.render('scrape', {
              allArticles: doc
          });
      }
  });
});


app.get("/articles/:id", function(req, res) {
  
  Article.findOne({ "_id": req.params.id })
    
    .populate("note")
    
    .exec(function(error, doc) {
        console.log(doc)
        
        if (error) {
          console.log(error);
        }
        
        else {
          res.render('comments', {
              articles: doc
          });
        }
    });
});



app.post("/articles/:id", function(req, res) {
  
  var newNote = new Note(req.body);
  var currentArticleID = req.params.id;
  
  newNote.save(function(error, doc) {
    
    if (error) {
      console.log(error);
    }
    
    else {
      
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
        
        .exec(function(err, doc) {
          
          if (err) {
            console.log(err);
          } else {
            
            res.redirect("/articles/" + currentArticleID)
          }
      });
    }
  });
});


app.post("/save/:id", function(req, res) {
  Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
    
    .exec(function(err, doc) {
      
      if (err) {
          console.log(err);
      } else {
        
        res.redirect("/saved");
      }
    });
})


app.put("/delete/:id", function(req, res) {
  Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false })
    
    .exec(function(err, doc) {
      
      if (err) {
          console.log(err);
      } else {
        
        res.redirect("/saved");
      }
    });
})


app.get("/saved", function(req, res) {
  
  Article.find({ 'saved': true }, function(error, doc) {
    
    if (error) {
        console.log(error);
    
    } else {
        res.render('savedArticles', {
            allArticles: doc
        });
      }
  });
});


app.listen(PORT, function() {
    console.log("App running on port 3000!");
});
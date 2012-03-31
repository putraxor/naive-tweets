// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; args.callee = args.callee.caller; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};

// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());



$(document).ready(function(){
  var tweet_id
    , languages
    , socket = io.connect()
    , pause = false
    , tweetQueue = [];

  //get languages
  $.getJSON('/api/languages', function(data){ 
    languages = data; 
    for(var language in languages){
      //build dropdown menu
      $('#languages .dropdown-menu').append('<li><a href="#" data-menu="' + language + '">' + languages[language]['name'] + '</a></li>');
    }
    $('.dropdown-toggle').dropdown();
  });

  socket.on('newTweet', scrollTweets);


  $('#classification button').click(function(){
    $('#loading').show();
    $(this)
      .addClass('btn-success')
      .siblings().addClass('disabled');
    socket.emit('requestTweet', { tweet_id: tweet_id, language: this.id });
  });

  $('#top-menu li a').click(function(){
    var menuItem = $(this).attr('data-menu');

    $(this).parent().addClass('active')
      .siblings().removeClass('active');

    if(menuItem == 'stream') {
      $('#content .tweets').empty();
      $('#content').show().addClass('stream');
      $('#classify').hide();
      $('#content h1').html('Live Tweets');
      pause = false;
    }

    return false;
  });
 
  $('#top-menu').on('click', 'li li a', function(){
    var menuItem = $(this).attr('data-menu');

    $('#content .tweets').empty()
    $('#content').show().removeClass('stream');
    $('#classify').hide();
    $('#content h1').html(languages[menuItem]['name'] + ' Tweets');
    $.getJSON('/api/getLanguage/' + menuItem, renderTweets);
    pause = true;

    return false;
  });

  $('#pause').click(function(){
    pause = (pause) ? false : true;
    $('span', this).html( (pause) ? 'Play' : 'Pause');
    $('i', this).removeClass().addClass( (pause) ? 'icon-play' : 'icon-pause' );
  });

  function scrollTweets(tweet){
    if(!pause){
      var tweetDivs = $('.tweetContainer .tweet');

      tweetQueue.push(tweet);
      if(tweetQueue.length >= 10 || tweetDivs.length <= 20){
        renderTweets(tweetQueue);
        tweetQueue = [];

        //remove elements from the dom every 10 tweets
        if(tweetDivs.length > 60){
          var tweetsToRemove = $('.tweetContainer .tweet:lt(' + (tweetDivs.length - 20) +')');

          tweetsToRemove.slideUp(function(){
            tweetsToRemove.remove();
          });
        }
      }
    }
  }

  function renderTweets(tweets){
    $('#loading').hide();

    var content = $('<div>');
    tweets.forEach(function(tweet){
      try{
        //update format to match standard stream
        if(!tweet.user){
          tweet.user = {
              profile_image_url: tweet.profile_image_url
            , screen_name: tweet.from_user
            , name: tweet.from_user_name
            , location: (tweet.geo) ? tweet.geo.coordinates[0] + ', ' + tweet.geo.coordinates[1] : ''
          }
        }

        tweet.text = parseTweetURL(tweet.text);
        tweet.predicted_language = {
            name: languages[tweet.predicted_language]['name']
          , code: tweet.predicted_language
        }

        //only show the top 4 probabilities over 0.3
        tweet.probabilities = [];
        for(var language in tweet.probability){
          if(tweet.probability[language] > 0.3 && tweet.probabilities.length <= 4){
            tweet.probabilities.push( { language:language, probability: Math.min(0.99, Math.round(tweet.probability[language]*100)/100 ), name: languages[language]['name'] } );
          }
        }

        //if nothing, then mark it unknown
        if(!tweet.probabilities.length){
          tweet.probabilities.push( {language:other, probability:0.99 } );
        }

        tweet.probabilities.sort(function(a, b){ return b.probability - a.probability; });
        content.append(ich.showTweet(tweet));

      } catch(e){}

    });
    $('#content .tweets').append(content.html());
    $('.timeago').timeago();

    $('#loading').hide();
  }
});


function parseTweetURL(text){
  // from http://www.simonwhatley.co.uk/parsing-twitter-usernames-hashtags-and-urls-with-javascript

  text = text.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
		return url.link(url);
	});

  text = text.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
		var username = u.replace("@","")
		return u.link("http://twitter.com/"+username);
	});

  text = text.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
		var tag = t.replace("#","%23")
		return t.link("http://search.twitter.com/search?q="+tag);
	});

  return text;
}


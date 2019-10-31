# jsforth
a FORTH written in Javascript

This was originally written on codepen.io [here](https://codepen.io/eparadis/pen/oNNGwWP?editors=0010)

It was inspired by [this blog post](http://beza1e1.tuxen.de/articles/forth.html)

# TODO

- as seen in the `begin..while` example, you have to go through some tortuous abuse of mode switching to
  make new words which that are more than simply a function call. That should be cleaned up. It comes
  down to how I implemented immediate words.
- I made up my own names for standard words because the standard words were confusing or dumb. I should
  probably make the FORTH use the standard words and then use a library to rename them to my liking 
  instead of the opposite.
- I need to set up a standard library to include.
- There aren't any conditionals yet.
- I only defined words in JS as (I thought) I needed them. This means there are some crazy gaps (ie: no
  multiply) and extraneous words (I've had no use for the heap or `@` or `!` yet, but there they are).
  I should decide how minimal I want the JS implementation to be and then do the rest of the standard
  words in FORTH in a standard library.
- The textbox is a terrible editor.
- The webpage has a terrible layout.
- I should write some words to interface with the HTML5 capabilities of the browser so there's something
  useful and interesting to do other than spew lines of `pre` elements.
- There should be a way to access local storage for saving your work or reading and writing persistent
  records.
- Maybe this whole thing could generate web-assembly? Whoa... that'd be neat.
- It'd be great to be able to link to this page with a FORTH script in the URL that'd load up.
- It'd be good to write some sort of time-based or frame-rate-based infinite loop detector and get rid
  of the hard word iteration limit.
- It could be a goal to write an adaptor layer to emulate the in-assembly parts of jonesForth and be
  able to load the in-FORTH parts of jonesForth.



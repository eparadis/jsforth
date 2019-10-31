document.querySelector("#run").addEventListener("click", run);
function g_log(line) {
  g_write(line + "\n");
}
function g_write(text) {
  document.getElementById("output").innerText += text;
}
function clear() {
  document.getElementById("output").innerText = "";
}
function g_debug(msg) {
  if (document.getElementById("debug").checked) {
    g_log(`DEBUG: ${msg}`);
  }
}
function g_error(msg) {
  g_log(`ERROR: ${msg}`);
}
function test_results(msg) {
  document.getElementById("test_results").innerText += msg
}

const starting_immediates = () => ([";", "immediate", "compile_TOS", "[", "compile_next", "return" ]);
let mode = "";
let compiling_word = undefined;
let p_counter = 0;
let immediates = [];
let compile_target_addr = 0
let call_stack = []
function exercise6(orig_input, stack, heap, incoming_dict, cout) {
  cout.debug(`orig_input: ${orig_input}`)
  let program = orig_input.split(/\s/);
  program = program.filter((w)=>(w.length > 0))
  program.push(undefined) // append a marker that this is the end of the program
  p_counter = 0
  compile_target_addr = program.length // for now, we just compile to the end of the program... maybe that's bad ???
  const get_next = ()=>{
    p_counter += 1;
    const result = program[p_counter];
    // cout.debug(`get_next: ${p_counter} ${result}`)
    return result;
  }
  function get_prev() {
    if (p_counter <= 1) {
      cout.log(`ERROR: program area underflow`);
      return undefined;
    }
    return program[p_counter - 1];
  }
  function stack_underflow(req_depth, name) {
    if (stack.length < req_depth) {
      cout.log(`ERROR: stack underflow ${name}`);
      return -1;
    }
  }

  let dict = {
    print: () => {
      if (stack_underflow(1, "print")) return -1;
      cout.log(stack.pop());
    },
    "+": () => {
      if (stack_underflow(2, "+")) return -1;
      stack.push(stack.pop() + stack.pop());
    },
    "-": () => {
      if (stack_underflow(2, "-")) return -1;
      stack.push(-stack.pop() + stack.pop());
    },
    dup: () => {
      if (stack_underflow(1, "dup")) return -1;
      const x = stack.pop();
      stack.push(x);
      stack.push(x);
    },
    swap: () => {
      if (stack_underflow(2, "swap")) return -1;
      const a = stack.pop();
      const b = stack.pop();
      stack.push(a);
      stack.push(b);
    },
    branch: () => {
      const next = get_next()
      // cout.debug(`branch next is ${next}`)
      const destOffset = Number.parseInt(next);
      const dest = p_counter + destOffset;
      cout.debug(`branch dest is ${dest}`)
      if (dest > program.length || dest < 0) {
        cout.error(`cannot branch to address ${dest}`);
        return -1;
      }
      p_counter = dest;
    },
    "branch?": () => {
      if (stack_underflow(1, "branch?")) return -1;
      // cout.debug(`p_counter is ${p_counter}`);
      const destOffset = Number.parseInt(get_next());
      if(Number.isNaN(destOffset)) {
        cout.error(`branch? destOffset is NaN!`)
        return -1
      }
      // cout.debug(`program (len: ${program.length}) is ${program}`);
      const dest = p_counter + destOffset;
      cout.debug(`branch? dest is ${dest}`);
      const flag = stack.pop();
      if (dest > program.length) {
        cout.error(`cannot branch? to address ${dest}`);
        return -1;
      }
      if (flag != 0) {
        // zero is false, non-zero is true
        cout.debug(`setting p_counter to ${dest} (${program[dest]})`);
        p_counter = dest;
      }
    },
    ":": () => {
      compiling_word = { name: get_next(), body: "", addr: undefined };
      mode = "compiling";
      // save the current compiling target location to get to it later
      compiling_word.addr = compile_target_addr
      cout.debug(`compiling ${compiling_word.name}...`);
    },
    ";": () => {
      if(immediates.includes(compiling_word.name)) {
        cout.debug(immediates)
        compile_word(']')
      }
      compile_word('return')
      cout.debug(`word compiled: ${JSON.stringify(compiling_word)}`);
      cout.debug(program.slice(compiling_word.addr))
      const body = compiling_word.body;
      // get the start of the word we just compiled (see the def of ':')
      const start_addr = compiling_word.addr
      incoming_dict[compiling_word.name] = () => {
        // calling a new word should jump to the word
        // so we need to push the current address on the return stack so we can get back
        call_stack.push(p_counter) // 'return' assumes this will always be a program-space address
        // start interpretting at the start of word we retrieved outside this lambda
        // we subtract one so that the subsequent get_next() will get the first compiled word
        p_counter = start_addr - 1
      };
      compiling_word = undefined;
      mode = "immediate";
    },
    immediate: () => {
      const prev = get_prev();
      if (!immediates.includes(prev)) {
        cout.debug(`adding immediate ${prev} (${immediates.length})`)
        immediates.push(prev);
      }
      compile_word('[')
    },
    "@": () => {
      if (stack_underflow(1, "@")) return -1;
      const address = stack.pop();
      if (heap[address] === undefined) {
        stack.push(0);
      } else {
        stack.push(heap[address]);
      }
    },
    "!": () => {
      if (stack_underflow(2, "!")) return -1;
      const address = stack.pop();
      const data = stack.pop();
      heap[address] = data;
    },
    here: () => {
      stack.push(p_counter - 1);
    },
    compile_TOS: () => {
      if (stack_underflow(1, "compile_TOS")) return -1;
      compile_word(stack.pop());
    },
    compile_next: () => {
      compile_word(get_next());
    },
    "[": () => {
      mode = "immediate";
    },
    "]": () => {
      mode = "compiling";
    },
    'return': () => {
      // pop the TOS from the return stack, which should be an address
      if(call_stack.length < 1) {
        cout.error(`call stack underflow: return`)
        return -1
      }
      const ret_addr = call_stack.pop()
      // jump to that address. I think this will always be a program-space address...
      p_counter = ret_addr
    }
  };
  for (var key in dict) {
    if (incoming_dict[key] === undefined) {
      incoming_dict[key] = dict[key];
    }
  }
  function compile_word(word) {
    const trimmed_word = word.toString().trim() // just in case (?)
    // put word at the current compiling target address
    program[compile_target_addr] = trimmed_word
    // advance the compiling target address
    compile_target_addr += 1
  }
  let next = program[0]
  let iter_limit = 200
  while (next !== undefined && iter_limit > 0) {
    iter_limit-=1
    cout.debug(
      `pc:${p_counter} ${
        mode == "compiling" ? "c" : "i"
      } ${next} >${stack}< cword:${JSON.stringify(compiling_word)}`
    );
    if (mode === "compiling") {
      if (immediates.includes(next)) {
        // cout.debug(`found immeidate word ${next}`)
        if (incoming_dict[next] === undefined) {
          cout.error(`dict[next] is undefined. next is ${next}`);
        }
        incoming_dict[next]();
      } else {
        // cout.debug(program)
        compile_word(next);
      }
    } else {
      if (incoming_dict[next] !== undefined) {
        if (incoming_dict[next]() === -1) {
          cout.debug(program)
          return "fail";
        }
      } else if (next.match(/^-?\d+$/)) {
        stack.push(Number.parseInt(next));
      } else {
        cout.error(`unknown word "${next}"`);
        return "fail";
      }
    }
    next = get_next();
  }
  if(iter_limit === 0) {
    return "iteration limit hit!"
  }
  return "ok";
}

function run() {
  clear();
  const run_stack = [];
  const run_heap = [];
  const input_text = document.querySelector("#program").value;
  mode = "immediate";
  p_counter = 0;
  immediates = starting_immediates()
  compiling_word = undefined
  const c = {
    error: g_error,
    log: g_log,
    debug: g_debug
  };
  g_log(exercise6(input_text, run_stack, run_heap, {}, c));
}

// run()
tests()

function tests() {
  let allPass = true
  function expect(input, output) {
    const run_stack = [];
    const run_heap = [];
    mode = "immediate";
    p_counter = 0;
    compiling_word = undefined
    immediates = starting_immediates()
    
    const actual = [];
    const c = {
      error: () => {},
      debug: () => {},
      log: msg => {
        actual.push(msg);
      }
    };
    exercise6(input, run_stack, run_heap, {}, c);
    let pass = true
    for(let i=0; i < output.length; i+=1) {
      pass = pass & !!(output[i] == actual[i])
    }
    if(!pass) {
      test_results(`\ntest '${input}' failed (exp:${JSON.stringify(output)})\n`)
    } else {
      test_results('.')
    }
    allPass = allPass & pass
  }

  expect("2 3 4 + + print", ["9"]);
  expect('branch 2 100 print 99 print', ['99'])
  expect('11 22 33 44 55 print branch -3', ['55', '44', '33', '22', '11'])
  expect('1 branch? 3 11 print 22 33 print', ['33'])
  expect('5 1 - dup dup print branch? -7', ['4', '3', '2', '1', '0'])
  expect(': ++ 1 + ; 5 ++ print', ['6'])
  expect(': foo immediate 11 print ; : bar foo ; 22 print bar 33 print', ['11', '22', '33'])
  expect(': countdown 1 - dup dup print branch? -7 ; 3 countdown', ['2', '1', '0'])
  expect('3 : foo compile_TOS + ; 4 foo print', ['7'])
  // this is what i think makes sense --> expect(': begin immediate compile_next here ; : while immediate compile_next branch? compile_next here compile_next [ - ] compile_next compile_TOS ; : foo begin 1 - dup dup print while ; 3 foo', ['2', '1', '0'])
  expect(': begin immediate here ; : while immediate ] compile_next compile_next branch? compile_next [ compile_next here compile_next - compile_next 1 compile_next + compile_next ] compile_next compile_TOS ; : foo begin 1 - dup dup print while ; 3 foo', ['2', '1', '0']) // this is what works ?!?!?
  // note that by nesting 'foo' into another word ('bar'), we have to tweak 'while' again!!!
  expect(': begin immediate here ; : while immediate ] compile_next compile_next branch? compile_next [ compile_next here compile_next - compile_next 1 compile_next + compile_next ] compile_next compile_TOS compile_next [ ; : foo begin 1 - dup dup print while ; : bar 3 foo 4 foo ; bar', '2103210'.split(''))
  
  if(allPass) {
    test_results('OK')
  } else {
    test_results('FAIL')
  }
}
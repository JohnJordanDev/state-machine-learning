const x = {
  a: {
    a1: "foo"
  },
  b: {
    b1: {
      b2: {
        b3: "bababas"
      }
    }
  },
  c: {
    c1: {
      c2: {
        c3: {
          c4: "farts"
        }
      }
    }
  }
};

function findXDepthFirst(key, obj) {
  if (typeof obj !== "object") return null;
  const k = Object.keys(obj);
  console.log("keys are: ", k);
  let r = null;
  for (let i = 0; i < k.length; i++) {
    if (key === k[i]) return obj[k[i]];
    r = findXDepthFirst(key, obj[k[i]]);
    if (r) return r;
  }
  return null;
}

function getGrandChildren(parentObj) {
  if (typeof parentObj !== "object") return null;
  const obj = {};
  const childKeys = Object.keys(parentObj);
  let currentKey;
  let grandChildKeys;
  let currentGrandChildKey;
  for (let i = 0; i < childKeys.length; i++) {
    currentKey = childKeys[i];
    if (typeof parentObj[currentKey] === "object") {
      grandChildKeys = Object.keys(parentObj[currentKey]);
      for (let j = 0; j < grandChildKeys.length; j++) {
        currentGrandChildKey = grandChildKeys[j];
        obj[currentGrandChildKey] = parentObj[currentKey][currentGrandChildKey];
      }
    }
  }
  return obj;
}

function findXBreadthFirst(key, obj) {
  if (typeof obj !== "object") return null;
  const k = Object.keys(obj);
  console.log("keys are: ", k);
  let nextLevelDown;
  let currentKey;
  let currentValue;
  for (let i = 0; i < k.length; i++) {
    currentKey = k[i];
    currentValue = obj[currentKey];
    if (key === currentKey) return obj[currentKey];
  }
  nextLevelDown = getGrandChildren(obj);
  return findXBreadthFirst(key, nextLevelDown);
}
const key = "c3";
const answer = findXBreadthFirst(key, x);
console.info("answer is: ", answer);
// console.error(getGrandChildren(x));

const otherAns = findXDepthFirst(key, x);
console.warn("depth first is: ", otherAns);

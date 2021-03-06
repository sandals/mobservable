var mobservable = require('mobservable')
var makeReactive = mobservable.makeReactive;


function buffer() {
    var b = [];
    var res = function(newValue) {
        b.push(newValue);
    };
    res.toArray = function() {
        return b;
    }
    return res;
}

exports.test1 = function(test) {
    try {
        var a = makeReactive([]);
        test.equals(a.length, 0);
        test.deepEqual(Object.keys(a), []);
        test.deepEqual(a.slice(), []);

        a.push(1);
        test.equals(a.length, 1);
        test.deepEqual(Object.keys(a), ["0"]);
        test.deepEqual(a.slice(), [1]);

        a[1] = 2;
        test.equals(a.length, 2);
        test.deepEqual(Object.keys(a), ["0", "1"]);
        test.deepEqual(a.slice(), [1,2]);

        var sum = makeReactive(function() {
            return -1 + a.reduce(function(a,b) {
                return a + b;
            }, 1);
        });

        test.equals(sum(), 3);

        a[1] = 3;
        test.equals(a.length, 2);
        test.deepEqual(Object.keys(a), ["0", "1"]);
        test.deepEqual(a.slice(), [1,3]);
        test.equals(sum(), 4);

        a.splice(1,1,4,5);
        test.equals(a.length, 3);
        test.deepEqual(Object.keys(a), ["0", "1", "2"]);
        test.deepEqual(a.slice(), [1,4,5]);
        test.equals(sum(), 10);

        a.replace([2,4]);
        test.equals(sum(), 6);

        a.splice(1,1);
        test.equals(sum(), 2);
        test.deepEqual(a.slice(), [2])

        a.spliceWithArray(0,0,[4,3]);
        test.equals(sum(), 9);
        test.deepEqual(a.slice(), [4,3,2]);

        a.clear();
        test.equals(sum(), 0);
        test.deepEqual(a.slice(), []);

        a.length = 4;
        test.equals(isNaN(sum()), true);
        test.deepEqual(a.length, 4);

        test.deepEqual(a.slice(), [undefined, undefined, undefined, undefined]);

        a.replace([1,2, 2,4]);
        test.equals(sum(), 9);
        a.length = 4;
        test.equals(sum(), 9);


        a.length = 2;
        test.equals(sum(), 3);
        test.deepEqual(a.slice(), [1,2]);
        var b = a.clone();

        test.deepEqual(a.reverse(), [2,1]);
        test.deepEqual(a.slice(), [2,1]);
        test.deepEqual(b.slice(), [1,2]);

        test.deepEqual(a.sort(), [1,2]);
        test.deepEqual(a.slice(), [1,2]);

        test.done();
    }
    catch(e) {
        console.error(e);
        throw e;
    }
};

exports.testFindAndRemove = function(test) {
    var a = mobservable.makeReactive([10,20,20]);
    var idx = -1;
    function predicate(item, index) {
        if (item === 20) {
            idx = index;
            return true;
        }
        return false;
    }

    test.equal(a.find(predicate), 20);
    test.equal(idx, 1);
    test.equal(a.find(predicate, null, 1), 20);
    test.equal(idx, 1);
    test.equal(a.find(predicate, null, 2), 20);
    test.equal(idx, 2);
    idx = -1;
    test.equal(a.find(predicate, null, 3), null);
    test.equal(idx, -1);

    test.equal(a.remove(20), true);
    test.equal(a.find(predicate), 20);
    test.equal(idx, 1);
    idx = -1;
    test.equal(a.remove(20), true);
    test.equal(a.find(predicate), null);
    test.equal(idx, -1);

    test.equal(a.remove(20), false);

    test.done();
}

exports.testQuickDiff = function(test) {
    function t(current, base, added, removed) {
        var res = mobservable._.quickDiff(current, base);
        test.deepEqual(res[0], added);
        test.deepEqual(res[1], removed);
    }

    t([],[],[],[]);
    t([1],[],[1],[]);
    t([],[1],[],[1]);
    t([1],[2],[1],[2]);

    t([1,2,3],[1,3],[2],[]);
    t([1,2,3],[1,2],[3],[]);

    t([1,2],[0,1,2],[],[0]);

    t([1,4,6,7,8], [1,2,3,4,5,6], [7,8], [2,3,5]);
    t([1,2,3,4], [4,3,2,1], [1,2,3], [3,2,1]); // suboptimal, but correct

    test.done();
};

exports.testObserve = function(test) {
    var ar = mobservable.makeReactive([1,4]);
    var buf = [];
    var disposer = ar.observe(function(changes) {
        buf.push(changes);
    }, true);

    ar[1] = 3; // 1,3
    ar[2] = 0; // 1, 3, 0
    ar.shift(); // 3, 0
    ar.push(1,2); // 3, 0, 1, 2
    ar.splice(1,2,3,4); // 3, 3, 4, 2
    test.deepEqual(ar.slice(), [3,3,4,2]);
    ar.splice(6);
    ar.splice(6,2);
    ar.replace(['a']);
    ar.pop();
    ar.pop(); // does not fire anything

    // check the object param
    buf.forEach(function(change) {
        test.equal(change.object, ar);
        delete change.object;
    });

    var result = [
        { type: "splice", index: 0, addedCount: 2, removed: [] },
        { type: "update", index: 1, oldValue: 4 },
        { type: "splice", index: 2, addedCount: 1, removed: [] },
        { type: "splice", index: 0, addedCount: 0, removed: [1] },
        { type: "splice", index: 2, addedCount: 2, removed: [] },
        { type: "splice", index: 1, addedCount: 2, removed: [0,1] },
        { type: "splice", index: 0, addedCount: 1, removed: [3,3,4,2] },
        { type: "splice", index: 0, addedCount: 0, removed: ['a'] },
    ]

    test.deepEqual(buf, result);

    disposer();
    ar[0] = 5;
    test.deepEqual(buf, result);

    test.done();
};


exports.test_array_modification1 = function(test) {
    var a = mobservable.makeReactive([1,2,3]);
    var r = a.splice(-10, 5, 4,5,6);
    test.deepEqual(a.slice(), [4,5,6]);
    test.deepEqual(r, [1,2,3]);
    test.done();
};

exports.testSerialize = function(test) {
    var a = [1,2,3];
    var m = mobservable.makeReactive(a);

    test.deepEqual(JSON.stringify(a), JSON.stringify(m));
    test.deepEqual(a, m);

    a = [4];
    m.replace(a);
    test.deepEqual(JSON.stringify(a), JSON.stringify(m));
    test.deepEqual(a, m);

    test.done();
};

exports.testArrayModificationFunctions = function(test) {
    var ars = [[], [1,2,3]];
    var funcs = ["push","pop","shift","unshift"];
    funcs.forEach(function(f) {
        ars.forEach(function (ar) {
            var a = ar.slice();
            var b = mobservable.makeReactive(a);
            var res1 = a[f](4);
            var res2 = b[f](4);
            test.deepEqual(res1, res2);
            test.deepEqual(a, b);
        });
    });
    test.done();
};

exports.testArrayWriteFunctions = function(test) {
    var ars = [[], [1,2,3]];
    var funcs = ["push","pop","shift","unshift"];
    funcs.forEach(function(f) {
        ars.forEach(function (ar) {
            var a = ar.slice();
            var b = mobservable.makeReactive(a);
            var res1 = a[f](4);
            var res2 = b[f](4);
            test.deepEqual(res1, res2);
            test.deepEqual(a, b);
        });
    });
    test.done();
};

exports.test_array_modification2 = function(test) {

    var a2 = mobservable.makeReactive([]);
    var inputs = [undefined, -10, -4, -3, -1, 0, 1, 3, 4, 10];
    var arrays = [[], [1], [1,2,3,4], [1,2,3,4,5,6,7,8,9,10,11],[1,undefined],[undefined]]
    for (var i = 0; i < inputs.length; i++)
    for (var j = 0; j< inputs.length; j++)
    for (var k = 0; k < arrays.length; k++)
    for (var l = 0; l < arrays.length; l++) {
        var msg = ["array mod: [", arrays[k].toString(),"] i: ",inputs[i]," d: ", inputs[j]," [", arrays[l].toString(),"]"].join(' ');
        var a1 = arrays[k].slice();
        a2.replace(a1);
        var res1 = a1.splice.apply(a1, [inputs[i], inputs[j]].concat(arrays[l]));
        var res2 = a2.splice.apply(a2, [inputs[i], inputs[j]].concat(arrays[l]));
        test.deepEqual(a1.slice(), a2, "values wrong: " + msg); // TODO: or just a2?
        test.deepEqual(res1, res2, "results wrong: " + msg);
        test.equal(a1.length, a2.length, "length wrong: " + msg);
    }

    test.done();
};

exports.test_is_array = function(test) {
    var x = mobservable.makeReactive([]);
    test.equal(x instanceof Array, true);

    // would be cool if these two would return true...
    test.equal(typeof x === "array", false);
    test.equal(Array.isArray(x), false);
    test.done();
}
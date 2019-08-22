const QUnit = require("steal-qunit");
const { mixinObject } = require("./helpers");
const { hooks } = require("../src/define");
const canReflect = require("can-reflect");

QUnit.module("can-observable-mixin - define()");

QUnit.test("Can define stuff", function(assert) {
  class Faves extends mixinObject() {
    static get props() {
      return {
			color: {
				default: "blue"
			}
      };
    }
  }

  let faves = new Faves();
  assert.equal(faves.color, "blue", "Got the value");
});

QUnit.test("Does not throw if no define is provided", function(assert) {
	class Faves extends mixinObject() {}
	new Faves();
	assert.ok(true, "Did not throw");
});

QUnit.test("Stuff is defined in constructor for non-element classes", function(assert) {
  class Faves extends mixinObject(Object) {
    static get props() {
      return {
			color: {
				default: "blue"
			}
      };
    }

	constructor() {
		super();
		assert.equal(this.color, "blue", "color exists after constructor");
	}
  }

  new Faves();
});

QUnit.test("Default strings work when they are like can-define types", function(assert) {
	class Person extends mixinObject() {
		static get props() {
			return {
				someProp: "number"
			};
		}
	}

	let p = new Person();
	assert.equal(p.someProp, "number", "Is the string 'number'");
});

QUnit.test("initialize can be called multiple times if Symbol is reset", function(assert) {
	const metaSymbol = Symbol.for("can.meta");
	class Obj extends mixinObject() {
		static get props() {
			return { age: Number };
		}
	}

	const obj = new Obj({ age: 30 });
	assert.equal(obj.age, 30, "initialized once by constructor");

	obj[metaSymbol].initialized = false;
	hooks.initialize(obj, { age: 35 });
	assert.equal(obj.age, 35, "initialized again");
});

QUnit.test("defineInstanceKey does not add to the base prototype", function(assert) {
	const Base = mixinObject();
	class Obj extends Base {}
	canReflect.defineInstanceKey(Obj, "_saving", {
		configurable: true,
		default: false,
		enumerable: false,
		writable: true
	});
	new Obj();

	let desc = Object.getOwnPropertyDescriptor(Base.prototype, "_saving");
	assert.ok(!desc, "There is no descriptor on the Base class");
});

QUnit.test("should not serialize properties using value and get behaviors unless they are `enumerable: true`", function(assert) {
	const props = {
		prop: String,
		propValue: {
			value({ listenTo, resolve }) {
				listenTo("prop", ({ value }) => resolve(value));
			}
		},
		propGetter: {
			get() {
				return this.prop;
			}
		},
		propAsync: {
			async(resolve) {
				resolve(this.prop);
			}
		}
	};

	class Obj extends mixinObject() {
		static get props() {
			return props;
		}
	}

	let obj = new Obj();
	obj.listenTo("propValue", () => {});
	obj.listenTo("propGetter", () => {});
	obj.listenTo("propAsync", () => {});

	assert.deepEqual(obj.serialize(), {}, "{} by default");

	obj.prop = "a";
	assert.deepEqual(obj.serialize(), { prop: "a" }, "only prop is serialized");

	// make props enumerable
	props.propValue.enumerable = true;
	props.propGetter.enumerable = true;
	props.propAsync.enumerable = true;

	class EnumerableObj extends mixinObject() {
		static get props() {
			return props;
		}
	}

	obj = new EnumerableObj();
	obj.listenTo("propValue", () => {});
	obj.listenTo("propGetter", () => {});
	obj.listenTo("propAsync", () => {});

	assert.deepEqual(obj.serialize(), {}, "{} by default");

	obj.prop = "b";
	let expected = { prop: "b", propGetter: "b", propValue: "b", propAsync: "b" };
	assert.deepEqual(obj.serialize(), expected, "all props are serialized");
});

---
date: 2020-03-16
title: 'Javascript Proxies : Real world use cases'
template: post
thumbnail: '../thumbnails/js.png'
slug: javascript-proxies-real-world-use-cases
categories:
  - Code
tags:
  - javascript
  - proxy
---

## Introduction To Proxy

In programming terms, proxy is any entity that acts on behalf of some other entity. A proxy server sits in between a client and server and acts a client for server and vice versa. The job of any proxy is to intercept incoming requests/calls and forward it upstream. This interception allows proxy to add logic and change behavior of incoming and outgoing requests.

Javascript proxy is something very similar, it sits between your actual object and the code trying to access this object.

According to the MDN Web Docs:
>The Proxy object is used to define custom behavior for fundamental operations (e.g. property lookup, assignment, enumeration, function invocation, etc).

## Terminologies

There are three terms we need to know before we can implement a proxy :

### Target

Target is the actual object our proxy will sit in front of and virtualize. This can be any javascript object.

### Traps

Traps are methods that will intercept the call to target when a property or method is called. There are [many](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) defined traps that can be implemented.

### Handler

Handler is an placeholder object where all traps live. You can think of it as an object with key beings traps and values being functions implementing those traps.

Lets look at a basic example :

```js
//movie is a target
const movie = {
	name: "Pulp Fiction",
	director: "Quentin Tarantino"
};

//this is a handler
const handler = {
	//get is a trap
	get: (target, prop) => {
		if (prop === 'director') {
			return 'God'
		}
		return target[prop]
	},

	set: function (target, prop, value) {
		if (prop === 'actor') {
			target[prop] = 'John Travolta'
		} else {
			target[prop] = value
		}
	}
};

const movieProxy = new Proxy(movie, handler);

console.log(movieProxy.director); //God

movieProxy.actor = "Tim Roth";
movieProxy.actress = "Uma Thurman";

console.log(movieProxy.actor); //John Travolta
console.log(movieProxy.actress); //Uma Thurman
```

The output of above code execution will be :

```terminal
God
John Travolta
Uma Thurman
```

In the above example our target object was `movie` object, we implemented a handler with a `get` and a `set` trap. We added a logic that if we are accessing `director` key, we should return the string `God` instead of the actual value. Similarly we added a `set` trap which will intercept all the writes to target object and change the value to `John Travolta` if the key is `actor`.

![possibilities are endless](../images/possibilities.jpg)
## Real world use cases

Although it is not as well known as other ES2015 features, Proxy has many uses few of which like default values for all properties of target might be obvious now. Lets take a look at more real world scenarios where we can use proxies.

### Validations

Since we can intercept writes to an object, we can do a validation on the value we are trying to set on the object. Lets take an example :

```js
const handler = {
	set: function (target, prop, value) {
		const houses = ['Stark', 'Lannister'];
		if (prop === 'house' && !(houses.includes(value))) {
			throw new Error(`House ${value} does not belong to allowed ${houses}`)
		}
		target[prop] = value
	}
};

const gotCharacter = new Proxy({}, handler);

gotCharacter.name = "Jamie";
gotCharacter.house = "Lannister";

console.log(gotCharacter);

gotCharacter.name = "Oberyn";
gotCharacter.house = "Martell";
```

The execution of above code will result in following output :

```terminal
{ name: 'Jamie', house: 'Lannister' }
Error: House Martell does not belong to allowed Stark,Lannister
```

In the above example we restrict that the value allowed for the property `house` can only be one of the allowed houses. We can even use this approach to create read only objects, all we need to do this throw inside the `set` trap.

### Side Effects

We can use proxies to create side effects on a property read/write. Idea is to trigger some function if a particular property is accessed or written. Lets take an example : 

```js
const sendEmail = () => {
	console.log("sending email after task completion")
};


const handler = {
	set: function (target, prop, value) {
		if (prop === 'status' && value === 'complete') {
			sendEmail()
		}
		target[prop] = value
	}
};

const tasks = new Proxy({}, handler);

tasks.status = "complete";
```

The execution of above code will result in following output :

```terminal
sending email after task completion
```

Here we are intercepting writes to property `status` and if the `status` is complete we are triggering a side effect function. On really cool implementation of this is in [Sindre Sorhus](https://github.com/sindresorhus)'s [on-change](https://github.com/sindresorhus/on-change) package.

### Caching
As we can intercept the access to object properties, we can build in memory caches to only return values for an object if it isn't expired. Lets look at an example :

```js
const cacheTarget = (target, ttl = 60) => {
	const CREATED_AT = Date.now();
	const isExpired = () => (Date.now() - CREATED_AT) > (ttl * 1000);
	const handler = {
		get: (target, prop) => isExpired() ? undefined : target[prop]
	};
	return new Proxy(target, handler)
};

const cache = cacheTarget({age: 25}, 5);

console.log(cache.age);

setTimeout(() => {
	console.log(cache.age)
}, 6 * 1000);
```

The execution of above code will result in following output :

```terminal
25
undefined
```

Here we create a function which returns a proxy and the handler for that proxy first checks if the object is expired or not. We can extend this functionality to have per key based TTLs and more.

### Drawbacks

While proxies are fairly magical but there few drawbacks with promises which we need to be careful about. 
1. Performance can take a [drastic](http://thecodebarbarian.com/thoughts-on-es6-proxies-performance) hit when using proxies and hence should be avoided when writing a performance critical code.
2. Given an object there is no way of knowing if this is an proxy object or target object.
3. Lastly, proxies do not necessarily lead to very clean and easily understandable code.

### Conclusion 

Proxies are incredibly powerful and can be used and abused for a wide array of things. In this article we looked at what proxies are, how to implement them, few real world use cases of them and their drawbacks. 


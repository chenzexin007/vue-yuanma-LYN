/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  isReservedAttribute,
  invokeWithErrorHandling
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy (target: Object, sourceKey: string, key: string) {
  // set、get实现
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  // 使用defineProperty拦截this.key, 返回 this[sourceKey][key] ： this._prop.key
  // 这样子我们就可以直接this.propKey，也就是直接在vue的this下面访问到props了
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

// 响应式入口，处理: props、methods、data、computed、watch
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  // initProps:
  // 1. 对props配置响应式处理
  // 2. 代理 props 配置上的 key 到vue实例， 可以直接 this.propKey 访问
  if (opts.props) initProps(vm, opts.props)
  // initMethods:
  // 1. 判重处理
  // 2. 将methodKey 代理到 vue实例， 通过 this.methods\Key 访问
  if (opts.methods) initMethods(vm, opts.methods)
  // initData
  // 1. data处理成对象
  // 2. 判重， data中的key不能和props、methods中的key重复
  // 3. 代理， 将 data中的key 代理到 vue实例上， 可以通过 this.dataKey访问
  // 4. 响应式
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  // initComputed
  // 1. computed是通过watcher实现的，给每个 computedKey 实例化一个watcher实例
  // 2. computed中的key 代理到 vue实例上 通过this.computedKey 访问
  // 3. 这里要注意看懂computed的缓存机制
  if (opts.computed) initComputed(vm, opts.computed)
  // initWatch
  // 核心： 实例化一个 watcher实例 并返回一个 unwatch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
  // computed 与 watch 的区别
  // 1. computed默认使用懒执行， 且不能修改（拦截了set），但是watcher科配置
  // 2. 使用的场景不同，watcher可以使用异步，但是computed使用异步的话，返回的是一个promise对象，用法错误
}

function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  // 遍历props
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    // 一些提示，不用看
    if (process.env.NODE_ENV !== 'production') {
      const hyphenatedKey = hyphenate(key)
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      // 响应式处理
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      // 代理， 将props上的key代理到vm上，这样可以直接this.key访问
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

function initData (vm: Component) {
  let data = vm.$options.data
  // 处理data， 以保证返回得data 是一个 对象
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  if (!isPlainObject(data)) {
    // 非对象， 直接赋值为空对象， 并给出警告
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  // data 的key 扁平化为数组
  const keys = Object.keys(data)
  // 判重，不能和 props和methos中的key重复
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      // 把data的key代理到 vue实例上， 可以通过 this.dataKey 访问
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  // 响应式处理
  observe(data, true /* asRootData */)
}

export function getData (data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

function initComputed (vm: Component, computed: Object) {
  // $flow-disable-line
  // 创建一个空对象，后面会使用到（主要用户存储每个computedKey对应的watcher对象）
  const watchers = vm._computedWatchers = Object.create(null)
  // computed properties are just getters during SSR
  // 是否服务端渲染
  const isSSR = isServerRendering()

  // 遍历 computed
  for (const key in computed) {
    // 拿到computed[key] => val
    // 因为val, 有可能是function或者{}，如果是function直接赋值，如果是{}就取里面的get方法
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {
      // create internal watcher for the computed property.
      // 给每个computed的key创建watcher实例监听
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      )
    }

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 去重
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(`The computed property "${key}" is already defined as a method.`, vm)
      }
    }
  }
}

export function defineComputed (
  target: any,
  key: string,
  userDef: Object | Function
) {
  const shouldCache = !isServerRendering()
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  // 将computed上的key代理到 vue实例上， 这样可以通过 this.computedKey 访问
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter (key) {
  return function computedGetter () {
    // 拿到对应的computed的key对应的watcher实例
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      /**
       * 执行wather.dirty
       * 1. 执行computed[key]的值（函数）得到函数返回的结果，赋值给watcher.value
       * 2. 将watcher.dirty置为false
       *  面试题： computed和methods有什么区别
       *  computed具有缓存：
       *    一次渲染中只执行一次computed[key]函数，后续访问就不会再执行（因为key对应的watcher.dirty已经被置为false)
       *    直到下一次更新时，也就是调用watcher.update时，我们可以看到它将dirty置为了true，这个时候我们的computed[key]函数又可以执行了
       */
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      // 返回watcher.value
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  // 判重处理， methods中的key不能和props中的key重复， 且 props的key优先级高一点
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }
      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    // 将 methods上的key 代理到 vue实例上， 可以 this.methodKey 访问对应的methods
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

function initWatch (vm: Component, watch: Object) {
  // 遍历watch
  // 判断watch[key]是否是数组，这里去看官网的使用方式：
  // 分为： 数组 和 非数组两种（这个可以是function、{}， 字符串等）
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher (
  vm: Component,
  expOrFn: string | Function,
  handler: any,
  options?: Object
) {
  // handle是对象
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // handle是string， 直接去vue实例的methods找这个字符串方法名
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () { return this._data }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ): Function {
    const vm: Component = this
    // 这里再判断一次cb是否为对象，是因为用户可以直接this.$watch的方式创建watch，可能会传入对象
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    // 标记这是一个 用户watcher
    options.user = true
    // 创建 watcher对象
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 如果有 immediate， 立即执行回调函数
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    // 返回一个 unwatch
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

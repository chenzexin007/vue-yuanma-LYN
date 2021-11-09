/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}
/**
 *
 */
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    // this.$emit( string | Array, fn), 可以是数组或者是string，也就是说多个事件监听都会执行同个fn的回调，
    const vm: Component = this
    if (Array.isArray(event)) {  // 数组，直接遍历，逐个处理成this.$emit('event1', cb1)
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else { // string， 已经是this.$emit('event1', cb1)的形式
      // 查找当前vue实例中的_events下是否有这个event事件明，没有就创建一个空数组，并把当前的这个cb函数push进去
      // 处理成 vm._event = { 'event1': [cb1, cb2 ...], ... }
      // 也就是说event和cb其实可以是一对一，一对多，多对一，多对多的情况
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        // hooER线不看
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  /**
   * 使用vm.$on添加事件监听
   * 执行我们的on函数
   * 移除该事件监听的on cb函数
   * 执行真正的回调
   */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    // 第二步： 触发我们的cb函数： on
    function on () {
      // 第三步： 移除我们的监听函数下的我们定义的cb函数
      vm.$off(event, on)
      // 第四步： 执行用户定义的真正cb函数
      fn.apply(vm, arguments)
    }
    on.fn = fn
    // 第一步： 使用vm.$on添加事件监听
    vm.$on(event, on)
    return vm
  }
  /**
   * 不传参数： 移除所有的监听函数， vm_events = Object.create(null)
   * 传入一个参数：
   *      数组： 遍历，递归调用成都是单独的event进行处理, 然后 移除这个监听函数下的所有cb函数， vm_events[event] = null
   *      字符串： 移除这个监听函数下的所有cb函数， vm_events[event] = null
   * 传入两个参数：
   *      移除指定监听函数的指定cb函数
   */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      // 不传递参数，也就是要一处==移除当前vm._event下的所有事件监听
      // vm._events = null
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      // 传入了第一个参数，并且是一个数组
      // 移除vm._events下所有该数组项为key的cb函数
      // 通过遍历，把vm._event下对应的key置为null
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    // 只传入第一个参数的最终都会走这里
    // 移除当前监听函数的所有cb函数
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    // 移除指定监听函数的指定cb函数
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // 找到监听函数下的所有cb函数
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // this.$emit('custom-click', arg1, arg2)
      // args = [arg1, arg2]
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 遍历执行每个cb函数
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}

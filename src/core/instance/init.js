/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    // 开始  初始化 性能测量，我们不做学习
    // let startTag, endTag
    // /* istanbul ignore if */
    // if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    //   startTag = `vue-perf-start:${vm._uid}`
    //   endTag = `vue-perf-end:${vm._uid}`
    //   mark(startTag)
    // }

    // a flag to avoid this being observed
    vm._isVue = true
    // 处理组件配置项
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 子组件处理： 性能优化： 减少原型链的动态查找，提高执行效率
      initInternalComponent(vm, options)
    } else {
      // 根组件： 选项合并，将全局配置合并到根组件的局部配置上
      /**
       * 发生选项合并的一共有三种情况：
       *  1） Vue.component('CompName', Com): 合并 Vue的全局组件 和 用户的自定义组件，最终会合并到全局的components选项上
       *  2） { components: { xxx } }: 局部注册， 执行编译器生成 render函数时做了选项合并，会合并全局配置到组件的局部配置上
       *  3） 也就是根组件这种情况
       */
      /**
       * eg.
       *  Vue.component('comp', {   // 这个vue是全局的，但是会被合并到下面vue的根组件的局部配置components上
       *    tenplate: '<div>i am comp</div>'
       * })
       *  new Vue({
       *    el: 'xx',
       *    data: {},
       *    components:{
       *       comp  // 这里的comp全局组件，是通过合并全局配置到该根组件对应配置上的结果
       *    }
       * })
       */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */ // 这个不重要，只是做了个代理，可以暂时不看
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm

    // 非常重要， 整个初始化最重要的部分， 核心

    // 1.组件关系属性的初始化： eg. $parent  $root $children
    initLifecycle(vm)
    // 2. 初始化  自定义事件
    /**
     * <com @click="handleClick"></com>
     * 组件上的事件更新其实是子组件自己在监听，也就是谁触发谁更新
     * 最终转化为: this.$emit('click')   this.$on('click', handleClick(){})
     */
    initEvents(vm)
    // 初始化 插槽，获取 this.$slot, 定义this._c也就是 createElement方法, 平时使用的 h
    initRender(vm)
    // 执行beforeCreate 生命周期函数
    callHook(vm, 'beforeCreate')
    //  初始化 inject 选项   主要开发高阶插件和组件库时使用，普通程序不推荐使用，详细可以上官网查看
    initInjections(vm) // resolve injections before data/props
    // 响应式原理的核心，处理： props、methods、computed、data
    initState(vm)
    // 处理 provide 选项，
    /**
     * provide和inject总结：
     *  provide在祖先组件中，而且并不会向子孙组件注入inject
     *  而是，子孙组件的inject主动向上遍历查找到对应key的provide
     */
    initProvide(vm) // resolve provide after data/props
    // 执行created 生命周期函数
    callHook(vm, 'created')

    // 结束 初始化 性能测量，我们也不做学习
    /* istanbul ignore if */
    // if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    //   vm._name = formatComponentName(vm, false)
    //   mark(endTag)
    //   measure(`vue ${vm._name} init`, startTag, endTag)
    // }

    // 如果存在 el选项，自动执行$mount，（如果没有el选项，需要自己手动$mount） 进入挂载阶段
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}
// 性能优化：  打平对象上的属性，减少运行时原型链的动态查找，提高效率
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 基于 构造函数 上的配置对象创建  vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  // 打平对象上的属性，减少运行时原型链的动态查找，提高效率
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag
  // 有render函数，将其赋值到 vm.$options
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 从构造函数上解析配置项
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 从实例构造函数上获取配置项
  let options = Ctor.options
  // 是否具有基类
  if (Ctor.super) {
    // 获取基类配置项
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 缓存
    const cachedSuperOptions = Ctor.superOptions
    // 基类配置项发生改变
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 找到更改的选项
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        // 将基类被修改的选项和extend选项合并
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 将最新的选项赋值给options， 并最后return
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}

/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

/**
 * 全局api：
 * 1.Vue.config
 * 2.工具方法 Vue.util
 *    Vue.util.warn  Vue.util.extend  Vue.util.mergeOptions  Vue.util.defineReactive
 * 3.Vue.set
 * 4.Vue.delete
 * 5.Vue.nextTick
 * 6.Vue.observable
 * 7.Vue.options
 *    Vue.options = { components: {}, directives: {}, filters: {} }
 *    Vue.options._base = Vue
 *
 */

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  // 获取默认配置
  configDef.get = () => config
  // 拦截 Vue.config的set, 不能直接修改
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 将默认配置代理到Vue.config上
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 全局api的实现
  Vue.util = {
    // 日志提示
    warn,
    // extend: 函数/配置对象， 和mixin类似: 一种浅拷贝to[key] = from[key]，用于复制上面的属性
    extend,
    // 选项合并
    mergeOptions,
    defineReactive
  }
  // 添加响应式key
  Vue.set = set
  // 删除响应式key
  Vue.delete = del
  // 实现nextTick
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 对整个对象进行响应式处理
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 相当于 Vue.options = { conponents: {}, directives: {}, filters: {} }
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 将Vue构造函数放到Vue.options._base上
  // 在实现Vue.options = { conponents: {}, directives: {}, filters: {} }等会用到
  Vue.options._base = Vue

  // 将keep-alive放到Vue.options.components对象中
  extend(Vue.options.components, builtInComponents)

  // 注册插件， 本质是执行 install方法，并将新插件存入插件缓存数组
  initUse(Vue)
  // 本质是选项合并， 将选项合并到全局的options上
  initMixin(Vue)
  initExtend(Vue)
  //实现： Vue.options = { conponents: {}, directives: {}, filters: {} }
  initAssetRegisters(Vue)
}

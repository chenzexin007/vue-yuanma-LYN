/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  /**
   * vue.use(function || object)  注册全局插件
   * 传入对象，那这个对象下要有install方法
   * 或者直接传入方法，那就直接认为这个式install方法
   */
  Vue.use = function (plugin: Function | Object) {
    // 从已缓存的插件中找这个插件，找到直接返回
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 取到install方法的参数
    const args = toArray(arguments, 1)
    args.unshift(this)
    // 式对象.install
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // 是function install
      plugin.apply(null, args)
    }
    // 将这个新插件放入缓存
    installedPlugins.push(plugin)
    return this
  }
}

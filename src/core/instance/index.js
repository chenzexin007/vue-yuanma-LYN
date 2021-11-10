import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// Vue 构造函数
function Vue (options) {
  // 这里只是打印环境，没啥用，不需要看
  // if (process.env.NODE_ENV !== 'production' &&
  //   !(this instanceof Vue)
  // ) {
  //   warn('Vue is a constructor and should be called with the `new` keyword')
  // }
  // _init方法在initMixin中， Vue.prototype._init
  this._init(options)
}
// 提供 vue.prototype._init方法
initMixin(Vue)
// 实例方法的实现
/**
 * vue.prototype.$data
 * vue.prototype.$props
 * vue.prototype.$set
 * vue.prototype.$del
 * vue.prototype.$watch
 */
stateMixin(Vue)
/**
 * vue.prototype.$on
 * vue.prototype.$once
 * vue.prototype.$off
 * vue.prototype.$emit
 */
eventsMixin(Vue)
/**
 * vue.prototype._update  diff算法入口
 * vue.prototype.$forceUpdate  强制组件重新渲染
 * vue.prototype.$destory 销毁组件，接触连接关系
 */
lifecycleMixin(Vue)
/**
 * 执行installRenderHepler, 在Vue.prototype下绑定许多_函数，作为render的时候的辅助函数
 * Vue.prototype.$nextTick 其实和Vue.nextTick是一样的
 * Vue.prototype._render, 执行vm.render 返回Vnode
 */
renderMixin(Vue)

export default Vue

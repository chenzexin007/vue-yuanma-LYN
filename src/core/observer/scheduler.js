/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  // 表示当前watcher队列正在被刷新
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  /**
   *  watcher队列排序:
   *  作用：
   *   1.保证更新是由父组件到子组件，因为父组件的created执行创建watcher是在子组件的created之前执行的，所以如果顺寻反了的话，
   *      子watcher触发更新， 父watcher触发更新时又触发了子watcher的更新，这样多更新了一次
   *   2. 用户watcher 先于 render watcher
   *   3. 当一个父组件在执行，而它的子组件被销毁，这样可以省掉子组件watcher的执行
   */
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 遍历watcher队列，执行watcher.run
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    // 当前watcher before钩子
    if (watcher.before) {
      watcher.before()
    }
    // 在watcher队列中释放掉该watcher， 下次这个该watcher就可以又进来了
    id = watcher.id
    has[id] = null
    // 执行run
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  /**
   * queue是一个全局的数组：
   * 1. 用来存放应该执行哪些watcher
   * 2. 去重
   */
  const id = watcher.id
  if (has[id] == null) {
    /**
     * 通过判断has[id]来判断是否又全新的watcher加入
     */
    has[id] = true
    if (!flushing) {
      // 当前watcher队列没有被刷新，watcher直接入队
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      /**
       * watcher队列正在被刷新， 入队需要做一些特殊处理
       * queue数组中的watcher其实是根据watcher.id从小到大排列的，
       * 所以我们通过遍历queue数组，可以找到当前watcher应该放哪
       */
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    if (!waiting) {
      // 表示当前浏览器的异步任务队列中没有 flushSchedulerQueue 函数
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        // 非生产环境，或者非异步(同步)，也就是同步执行，直接去刷新watcher队列
        // 性能大打折扣
        flushSchedulerQueue()
        return
      }
      // 我们熟悉的this.$nextTick 或者 Vue.$nextTick
      nextTick(flushSchedulerQueue)
    }
  }
}

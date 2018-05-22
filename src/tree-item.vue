<template>
    <li role="treeitem"
        :class="classes"
        :draggable="draggable"
        @dragstart.stop="onItemDragStart($event, _self, _self.model)"
        @dragend.stop.prevent="onItemDragEnd($event, _self, _self.model)"
        @dragover.stop.prevent="isDragEnter = true"
        @dragenter.stop.prevent="isDragEnter = true"
        @dragleave.stop.prevent="isDragEnter = false"
        @drop.stop.prevent="handleItemDrop($event, _self, _self.model)">
        <div role="presentation" :class="wholeRowClasses" v-if="isWholeRow">&nbsp;</div>
        <i class="tree-icon tree-ocl" role="presentation" @click="handleItemToggle"></i>
        <div :class="anchorClasses" v-on="events">
            <i class="tree-icon tree-checkbox" role="presentation" v-if="showCheckbox && !model.loading" @click="handleCheckboxClick"></i>
            <slot :vm="this" :model="model">
                <i :class="themeIconClasses" role="presentation" v-if="!model.loading"></i>
                <span v-html="model[textFieldName]"></span>
            </slot>
        </div>
        <ul role="group" ref="group" class="tree-children" v-if="isFolder" :style="groupStyle">
            <tree-item v-for="(child, index) in model[childrenFieldName]"
                       :key="index"
                       :data="child"
                       :text-field-name="textFieldName"
                       :value-field-name="valueFieldName"
                       :children-field-name="childrenFieldName"
                       :item-events="itemEvents"
                       :whole-row="wholeRow"
                       :show-checkbox="showCheckbox"
                       :allow-transition="allowTransition"
                       :height= "height"
                       :parent-item="model[childrenFieldName]"
                       :draggable="draggable"
                       :drag-over-background-color="dragOverBackgroundColor"
                       :on-item-click="onItemClick"
                       :on-checkbox-click="onCheckboxClick"
                       :on-item-highlight="onItemHighlight"
                       :on-item-toggle="onItemToggle"
                       :on-item-drag-start="onItemDragStart"
                       :on-item-drag-end="onItemDragEnd"
                       :on-item-drop="onItemDrop"
                       :klass="index === model[childrenFieldName].length-1?'tree-last':''">
                <template slot-scope="_">
                    <slot :vm="_.vm" :model="_.model">
                        <i :class="_.vm.themeIconClasses" role="presentation" v-if="!model.loading"></i>
                        <span v-html="_.model[textFieldName]"></span>
                    </slot>
                </template>
            </tree-item>
        </ul>
    </li>
</template>
<script>
  export default {
      name: 'TreeItem',
      props: {
          data: {type: Object, required: true},
          textFieldName: {type: String},
          valueFieldName: {type: String},
          childrenFieldName: {type: String},
          itemEvents: {type: Object},
          wholeRow: {type: Boolean, default: false},
          showCheckbox: {type: Boolean, default: false},
          allowTransition: {type: Boolean, default: true},
          height: {type: Number, default: 24},
          parentItem: {type: Array},
          draggable: {type: Boolean, default: false},
          dragOverBackgroundColor: {type: String},
          onItemClick: {
              type: Function, default: () => false
          },
          onCheckboxClick: {
              type: Function, default: () => false
          },
          onItemHighlight: {
              type: Function, default: () => false
          },
          onItemToggle: {
              type: Function, default: () => false
          },
          onItemDragStart: {
              type: Function, default: () => false
          },
          onItemDragEnd: {
              type: Function, default: () => false
          },
          onItemDrop: {
              type: Function, default: () => false
          },
          klass: String
      },
      data () {
          return {
              isHover: false,
              isDragEnter: false,
              model: this.data,
              maxHeight: 0,
              events: {}
          }
      },
      watch: {
          isDragEnter (newValue) {
              if (newValue) {
                  this.$el.style.backgroundColor = this.dragOverBackgroundColor
              } else {
                  this.$el.style.backgroundColor = "inherit"
              }
          },
          data (newValue) {
              this.model = newValue
          },
          'model.opened': {
              handler: function (val, oldVal) {
                  if (!val) {
                      this.rehighlightChildren(this.model.highlighted)
                  }
                  this.onItemToggle(this, this.model)
                  this.handleGroupMaxHeight()
              },
              deep: true
          },
          'model.children': {
              handler: function (val, oldVal) {
                  // For some reason, these are what we get when a node is deleted.
                  if (oldVal && val.length == 0 && oldVal.length == 0) {
                    this.checkIndeterminate();
                  }
              },
              immediate: true,
          },
          'model.selected': {
              handler: function (val, oldVal) {
                  if (this.model.indeterminate && val) {
                    this.model.indeterminate = false;
                    return;
                  }
                  if (this.$parent.$options._componentTag === 'tree-item') {
                    this.$parent.checkIndeterminate();
                  }
              },
              immediate: true,
          },
          'model.indeterminate': {
              handler: function (val, oldVal) {
                  if (this.$parent.$options._componentTag === 'tree-item') {
                    this.$parent.checkIndeterminate();
                  }
              },
              immediate: true,
          },
          'model.highlighted': {
              handler: function (val, oldVal) {
                  if (!this.model.ignoreHighlightPropagation) {
                    this.rehighlightChildren(val);
                  } else {
                      delete this.model.ignoreHighlightPropagation
                  }
                  if (this.$parent.$options._componentTag === 'tree-item' && !this.model.ignoreUpwardHighlightPropagation) { 
                    this.$parent.checkChildrenHighlight()
                  } else if (this.model.ignoreUpwardHighlightPropagation) {
                      delete this.model.ignoreHighlightPropagation
                  }
                  this.handleItemHighlight();
              },
              immediate: true,
          },
      },
      computed: {
          isFolder () {
              return this.model[this.childrenFieldName] && this.model[this.childrenFieldName].length
          },
          classes () {
              return [
                  {'tree-node': true},
                  {'tree-open': this.model.opened},
                  {'tree-closed': !this.model.opened},
                  {'tree-leaf': !this.isFolder},
                  {'tree-loading': !!this.model.loading},
                  {'tree-drag-enter': this.isDragEnter},
                  {'tree-indeterminate': this.model.indeterminate},
                  {[this.klass]: !!this.klass}
              ]
          },
          anchorClasses () {
              return [
                  {'tree-anchor': true},
                  {'tree-disabled': this.model.disabled},
                  {'tree-checked': this.model.selected},
                  {'tree-clicked': this.model.highlighted},
                  {'tree-hovered': this.isHover}
              ]
          },
          wholeRowClasses () {
              return [
                  {'tree-wholerow': true},
                  {'tree-wholerow-clicked': this.model.highlighted},
                  {'tree-wholerow-hovered': this.isHover}
              ]
          },
          themeIconClasses () {
              return [
                  {'tree-icon': true},
                  {'tree-themeicon': true},
                  {[this.model.icon]: !!this.model.icon},
                  {'tree-themeicon-custom': !!this.model.icon}
              ]
          },
          isWholeRow () {
              if (this.wholeRow) {
                  if (this.$parent.model === undefined) {
                      return true
                  } else if (this.$parent.model.opened === true) {
                      return true
                  } else {
                      return false
                  }
              }
          },
          groupStyle () {
              return {
                  'position': this.model.opened ? '' : 'relative',
                  'max-height': !!this.allowTransition ? this.maxHeight + 'px' : '',
                  'transition-duration': !!this.allowTransition ? Math.ceil(this.model[this.childrenFieldName].length / 100) * 300 + 'ms' : '',
                  'transition-property': !!this.allowTransition ? 'max-height' : '',
                  'display': !!this.allowTransition ? 'block' : (this.model.opened ? 'block' : 'none')
              }
          },
      },
      methods: {
          handleItemToggle (e) {
              if (this.isFolder) {
                  this.model.opened = !this.model.opened
                  this.onItemToggle(this, this.model)
              }
          },
          handleGroupMaxHeight () {
              if (!!this.allowTransition) {
                  let length = 0
                  let childHeight = 0
                  if (this.model.opened) {
                      length = this.$children.length
                      for (let children of this.$children) {
                          childHeight += children.maxHeight
                      }
                  }
                  this.maxHeight = length * this.height + childHeight
                  if (this.$parent.$options._componentTag === 'tree-item') {
                      this.$parent.handleGroupMaxHeight()
                  }
              }
          },
          handleItemClick (e) {
              if (this.model.disabled) return
              this.model.highlighted = !this.model.highlighted
              this.onItemClick(this, this.model, e)
          },
          handleCheckboxClick (e) {
              if (this.model.disabled) return
              this.model.selected = !this.model.selected
              this.onCheckboxClick(this, this.model, e)
              e.stopPropagation();
          },
          handleItemHighlight () {
              this.onItemHighlight(this, this.model)
          },
          handleItemMouseOver () {
              this.isHover = true
          },
          handleItemMouseOut () {
              this.isHover = false
          },
          handleItemDrop (e, oriNode, oriItem) {
              this.$el.style.backgroundColor = "inherit"
              this.onItemDrop(e, oriNode, oriItem)
          },
          checkIndeterminate() {
            if (!this.isFolder) return;
            let firstDone = false;
            let state = false;
            for (let child of this.$children) {
                if (child.model.indeterminate || (firstDone && child.model.selected != state)) {
                    //TODO: come up with a better way to do this that doesn't involve checking parents twice.
                    this.model.selected = false;
                    this.model.indeterminate = true;
                    return;
                } else if (!firstDone) {
                    firstDone = true;
                    state = child.model.selected;
                    continue;
                }
            }
            this.model.indeterminate = false;
            this.model.selected = state;
          },
          rehighlightChildren(newVal){
              for (let child of this.$children) {
                  child.model.highlighted = newVal;
                  child.rehighlightChildren(newVal);
              }
          },
          checkChildrenHighlight() {
            if (!this.isFolder) return;
            let childrenHighlighted = true;
            for (let child of this.$children) {
                if (!child.model.highlighted) {
                    childrenHighlighted = false;
                    break;
                }
            }
            if (childrenHighlighted != this.model.highlighted) {
                this.model.ignoreHighlightPropagation = true;
                this.model.highlighted = childrenHighlighted;
            }
          },
          delete() {
              this.model.ignoreUpwardHighlightPropagation = true;
              this.model.highlighted = false;
              for (let child of this.$children) {
                child.delete();
              }
              this.$nextTick(() => {
                this.parentItem.splice(this.parentItem.indexOf(this.model), 1)
              })
          }
      },
      created () {
          const self = this
          const events = {
              'click': this.handleItemClick,
              'mouseover': this.handleItemMouseOver,
              'mouseout': this.handleItemMouseOut
          }
          for (let itemEvent in this.itemEvents) {
              let itemEventCallback = this.itemEvents[itemEvent]
              if (events.hasOwnProperty(itemEvent)) {
                  let eventCallback = events[itemEvent]
                  events[itemEvent] = function (event) {
                      eventCallback(self, self.model, event)
                      itemEventCallback(self, self.model, event)
                  }
              } else {
                  events[itemEvent] = function (event) {
                      itemEventCallback(self, self.model, event)
                  }
              }
          }
          this.events = events
      },
      mounted () {
          this.handleGroupMaxHeight()
      },
  }
</script>

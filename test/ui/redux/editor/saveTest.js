import 'should'
import { actions, ActionTypes } from '../../../../src/redux/editor'
import * as entities from '../../../../src/redux/entities'
import { describeAsyncStore, itAsync } from './../asyncStore.js'

describeAsyncStore('editor.actions.save', ({ store, api, history }) => {
  itAsync('should dispatch ENTITIES_SAVE, SAVE_STARTED and SAVE_SUCCESS', async () => {
    api.patch((p) => ({}))

    store.update({
      entities: { '1': { __entitySet: 'testEntity', _id: '1', shortid: 'foo' } },
      editor: { tabs: [{ key: '1', _id: '1', type: 'entity', entitySet: 'testEntity' }], activeTabKey: '1' }
    })

    await store.dispatch(actions.save())

    history.should.containEql(entities.ActionTypes.SAVE)
    history[entities.ActionTypes.SAVE]._id.should.be.eql('1')
    history.should.containEql(ActionTypes.SAVE_STARTED)
    history.should.containEql(ActionTypes.SAVE_SUCCESS)
  })
})

import React from 'react'
import 'should'
import Preview from '../../../../src/components/Preview/Preview.js'
import Enzyme, { shallow } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

Enzyme.configure({ adapter: new Adapter() })

// don't find out such kind of component tests very much useful, but contributions welcome
describe('<Preview />', () => {
  it('calls componentDidMount', () => {
    shallow(<Preview />).contains(<div style={{ display: 'none' }} />).should.be.ok()
  })
})

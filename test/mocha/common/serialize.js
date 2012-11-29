/*global requirejs describe it beforeEach */

requirejs([
  'common/serialize'
], function (serialize) {

  var metaData = {
    a: {
    },
    b: {
      serialize: true
    },
    c: {
      serialize: false
    }
  };

  describe('serialize()', function() {
    it('should take into account "serialize" meta property', function () {
      // The input is correct.
      var input = {
        a: [1],
        b: [2, 3],
        c: [4, 5, 6]
      },

      result = serialize(metaData, input);

      result.should.be.a('object');
      result.should.have.property('a');
      result.should.have.property('b');
      result.should.not.have.property('c');

      result.a.should.eql(input.a);
      // equal is strict equality.
      // Whole array should be copied, not only reference!
      result.a.should.not.equal(input.a);
      result.b.should.eql(input.b);
      // equal is strict equality.
      // Whole array should be copied, not only reference!
      result.b.should.not.equal(input.b);
    });
    it('should handle cases when some properties are undefined', function () {
      // The input is correct.
      var input = {
        a: [1],
      //b: undefined
        c: [4, 5, 6]
      },

      result = serialize(metaData, input);

      result.should.be.a('object');
      result.should.have.property('a');
      result.should.not.have.property('b');
      result.should.not.have.property('c');

      result.a.should.eql(input.a);
      // equal is strict equality.
      // Whole array should be copied, not only reference!
      result.a.should.not.equal(input.a);
    });
  });
});
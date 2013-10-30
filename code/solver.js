//solver
var solver = Class.extend({
    init: function () {
        this.maxStep = 1e-2;
    },
    solve: function (state0, df, dt) {
        var left = dt;
        var hop;
        var tstate = state0;
        while(left > 0) {
            hop = Math.min(left, this.maxStep);
            tstate = this.step(tstate, df, hop);
            left = left - hop;
        }
        return tstate;
    },
    step: function (state0, df, dt) {
        var len = state0.length;
        var retstate = Array(len);
        var tmpstate = Array(len);
        var k1, k2, k3, k4;
        k1 = df(state0);
        for(var i=0; i<len; ++i) {
            tmpstate[i] = state0[i] + k1[i]*dt/2;
        }
        k2 = df(tmpstate);
        for(i=0; i<len; ++i) {
            tmpstate[i] = state0[i] + k2[i]*dt/2;
        }
        k3 = df(tmpstate);
        for(i=0; i<len; ++i) {
            tmpstate[i] = state0[i] + k3[i]*dt;
        }
        k4 = df(tmpstate);
        for(i=0; i<len; ++i) {
            retstate[i] = state0[i] + (k1[i]/6 + k2[i]/3 + k3[i]/3 + k4[i]/6)*dt;
        }
        return retstate;
    }
});

return new solver();

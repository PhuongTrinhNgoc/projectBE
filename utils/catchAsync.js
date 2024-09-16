const catchAsync = (fn)=>{
    const errHandle = (req,res,next)=>{
        fn(req,res,next).catch(next)
    }
    return errHandle
}
module.exports = catchAsync
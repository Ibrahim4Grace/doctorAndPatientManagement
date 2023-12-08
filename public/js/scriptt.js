const NumberToCount = document.querySelectorAll('.count-number')
/** Animation Duration */
const countDuration = 1500
/** Number Count Interval */
const countInterval = 50
/** Times the number text will change */
const count= countDuration / countInterval

/** Formatting Number string before render*/
const formatNum =function(number, maxDecimal){
    return number.toLocaleString('en-US', {style:'decimal', minimumFractionDigits:maxDecimal, maximumFractionDigits:maxDecimal});
}

/** Number Counting Animation Function */
const countNumber = function(el, number){
    /** Check first if the element is already done or started the animation */
    if(!!el.dataset.is_count && el.dataset.is_count == "true")
        return false

    /** Mark the element animation as started or done */
    el.dataset.is_count = true
    
    //starting number of animation
    var start = number / count;

    //Getting the Decimal
    var decimal = String(number).split('.')
    //Getting the Decimal length
    var decLen = !!decimal[1] && decimal[1].length > 0 ? decimal[1].length : 0;
    // Storing Current display number
    var current = start;

    // Start Animation Interval
    var countIntervalFunc = setInterval(()=>{
        current = current + start
        el.innerText = formatNum(current > number ? number : current, decLen)
        if(current >= number){
            // Stop interval if the original number has been reached
            clearInterval(countIntervalFunc)
        }
    },countInterval) 
}

/** Animation Trigger Function */
const screenScrollAnimate = function(el, number){
    var screenHeight = window.innerHeight
    var offset = window.scrollY
    console.log(offset , offset + screenHeight, el.offsetTop)
    if(el.offsetTop >=  offset && el.offsetTop <= (offset + screenHeight) ){
        countNumber(el, number)
    }
}

/**
 * Adding Number Counting Animation to all elements w/ this animation className
 */
NumberToCount.forEach(numContainer =>{
    var _num = numContainer.innerText
        _num = _num.replace(/\,/gi, '')
        _num = parseFloat(_num)

    /** Event Listeners to trigger the animation */
    window.addEventListener('load', screenScrollAnimate.bind(null, numContainer, _num))
    window.addEventListener('resize', screenScrollAnimate.bind(null, numContainer, _num))
    window.addEventListener('scroll', screenScrollAnimate.bind(null, numContainer, _num))
       
})
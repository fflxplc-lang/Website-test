/* Goal cards -> the Investment Blueprint Input Form on this website
   (pages/blueprint-form.html), drawn from Finowise BOSS's own form
   definitions and sent to the BOSS LMS when submitted.

     data-blueprint-goal="single"       Single Goal    -> Goal Based Investment
     data-blueprint-goal="multiple"     Multiple Goal  -> Goal Based Investment
     data-blueprint-goal="inspiring"    Inspiring Goal -> Financial Success Ladder
     data-blueprint-goal="sevenevents"  7 Events Plan  -> Comprehensive Freedom Blueprint (7 Events)
     data-blueprint-goal="goldenage"    Golden Age     -> Golden Age Blueprint            */
(function () {
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-blueprint-goal]");
    if (!b) return;
    e.preventDefault();
    location.href = "blueprint-form.html?goal=" + encodeURIComponent(b.getAttribute("data-blueprint-goal"));
  });
})();

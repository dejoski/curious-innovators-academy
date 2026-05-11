const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

// Fix the syntax error in the useEffect
content = content.replace(
  `    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setOpenActionId(null);
      }
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);`,
  `    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setOpenActionId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);`
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);

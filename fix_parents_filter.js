const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/parents/page.tsx', 'utf8');

content = content.replace(
  '<div className="relative">',
  '<div className="relative" ref={filterRef}>'
);

content = content.replace(
  'const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);',
  `const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);`
);

fs.writeFileSync('src/app/dashboard/parents/page.tsx', content);

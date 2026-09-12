import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { uiConfig } from '../../config/uiConfig';
import { ROUTE_PATHS } from '../../routes/paths';
import Header from './Header';
import HeaderSearch from './HeaderSearch';

const PublicHeader = () => {
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(
    () => location.pathname === ROUTE_PATHS.courses
      ? new URLSearchParams(location.search).get('search') ?? ''
      : ''
  );

  const goToSearch = useCallback(
    (value: string) => {
      const keyword = value.trim();
      if (location.pathname === ROUTE_PATHS.courses) {
        const next = new URLSearchParams(location.search);
        if (keyword) next.set('search', keyword);
        else next.delete('search');
        next.set('page', '0');
        navigate(`${ROUTE_PATHS.courses}?${next.toString()}`);
        return;
      }
      navigate(
        keyword
          ? `${ROUTE_PATHS.courses}?search=${encodeURIComponent(keyword)}`
          : ROUTE_PATHS.courses
      );
    },
    [location.pathname, location.search, navigate]
  );

  const [debouncedGoToSearch, cancelPendingSearch] = useDebouncedCallback(
    goToSearch,
    uiConfig.timing.searchDebounceMs
  );

  useEffect(() => {
    cancelPendingSearch();
    setSearchQuery(
      location.pathname === ROUTE_PATHS.courses
        ? new URLSearchParams(location.search).get('search') ?? ''
        : ''
    );
  }, [cancelPendingSearch, location.pathname, location.search]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      debouncedGoToSearch(value);
    },
    [debouncedGoToSearch]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      cancelPendingSearch();
      goToSearch(searchQuery);
    },
    [cancelPendingSearch, goToSearch, searchQuery]
  );

  return (
    <Header
      cartCount={cartCount}
      renderSearch={(mobile = false) => (
        <HeaderSearch mobile={mobile} value={searchQuery} onChange={handleSearchChange} onSubmit={handleSearchSubmit} />
      )}
    />
  );
};

export default PublicHeader;

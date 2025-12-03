import React from 'react';

const Snowfall = () => {
  // Membuat 100 elemen untuk dirender sebagai kepingan salju
  const snowflakes = Array.from({ length: 100 });

  return (
    <div className="snowfall-container" aria-hidden="true">
      {snowflakes.map((_, index) => (
        <div key={index} className="snowflake"></div>
      ))}
    </div>
  );
};

export default Snowfall;
import React,{useEffect, useState} from 'react';
import {useMapEvents} from 'react-leaflet';

const LocateUser = () => {
    
        const map = useMapEvents({
          locationfound(e) {
           map.panTo(e.latlng, map.setView(e.latlng))
           //save location to user session 
            sessionStorage.setItem('userLocation', JSON.stringify(e.latlng));
            localStorage.setItem('userLocation', JSON.stringify(e.latlng));
            map.loading = false;
          },
        })

        useEffect(() => {
          map.locate()
        }, [map])

        
        
        return null;
      
      };

export default LocateUser;
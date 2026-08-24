package com.zh.learnhub_api.configs;

import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;

import java.time.ZoneId;
import java.util.TimeZone;

public final class TimeZoneEnvironmentListener
        implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    public static final String TIME_ZONE_PROPERTY = "app.time-zone";

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        String zoneId = event.getEnvironment().getRequiredProperty(TIME_ZONE_PROPERTY);
        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of(zoneId)));
    }
}

package com.vansh.eventsphere.eventsphere.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * MongoDB configuration to handle LocalDateTime ↔ Date conversion
 * without timezone shifting.
 *
 * By default, Spring Data MongoDB converts Date (UTC) to LocalDateTime
 * using the JVM's default timezone, which causes a +5:30 shift in IST.
 * These custom converters ensure LocalDateTime is stored and read back
 * as-is (treating it as UTC on both sides) so there is no offset mismatch.
 */
@Configuration
public class MongoConfig {

    @Bean
    public MongoCustomConversions customConversions() {
        List<Converter<?, ?>> converters = new ArrayList<>();
        converters.add(new LocalDateTimeToDateConverter());
        converters.add(new DateToLocalDateTimeConverter());
        return new MongoCustomConversions(converters);
    }

    /**
     * Write: LocalDateTime → Date (treat LocalDateTime as UTC directly)
     */
    private static class LocalDateTimeToDateConverter implements Converter<LocalDateTime, Date> {
        @Override
        public Date convert(LocalDateTime source) {
            return Date.from(source.toInstant(ZoneOffset.UTC));
        }
    }

    /**
     * Read: Date → LocalDateTime (convert back from UTC without applying JVM timezone)
     */
    private static class DateToLocalDateTimeConverter implements Converter<Date, LocalDateTime> {
        @Override
        public LocalDateTime convert(Date source) {
            return source.toInstant().atOffset(ZoneOffset.UTC).toLocalDateTime();
        }
    }
}

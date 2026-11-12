package com.vansh.eventsphere.eventsphere.certificate.config;


import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;

@Configuration
public class CertificateIndexConfig {

    @Bean
    ApplicationRunner createCertificateIndex(MongoTemplate mongoTemplate) {
        return args -> {
            var certificate = mongoTemplate.getCollection("certificates");

            certificate.createIndex(
                    Indexes.ascending("certificateNumber"),
                    new IndexOptions()
                            .name("uq_certificate_number")
                            .unique(true)
            );

            certificate.createIndex(
                    Indexes.compoundIndex(
                            Indexes.ascending("recipientUserId", "status"),
                            Indexes.descending("issuedAt", "_id")
                    ),
                    new IndexOptions().name("idx_certificate_recipient_listing")
            );

            var entitlement = mongoTemplate.getCollection("certificate_entitlements");

            entitlement.createIndex(
                    Indexes.compoundIndex(
                            Indexes.ascending(
                                    "recipientUserId",
                                    "type",
                                    "scope",
                                    "scopeId"

                            )

                    ),

                    new IndexOptions().name("uq_certificate_entitlement")
                            .unique(true)
            );
        };
    }
}

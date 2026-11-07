package com.vansh.eventsphere.eventsphere;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
        "jwt.access-token-expiration=86400000"
})
class EventSphereApplicationTests {

    @Test
    void contextLoads() {
    }

}
